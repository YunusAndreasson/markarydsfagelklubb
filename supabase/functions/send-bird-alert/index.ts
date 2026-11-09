// Supabase Edge Function (Deno) — send-bird-alert
//
// Fans an observation out to every member's device EXCEPT the reporter's, via
// the Expo push service. Invoked by the native client (fire-and-forget) right
// after a successful insert:
//
//   supabase.functions.invoke('send-bird-alert', { body: { observationId, placeLabel? } })
//
// `placeLabel` is the client's reverse-geocoded name for a pin-drop observation
// (which has no lokal row in the DB) — it fills the place slot in the
// notification body so the location is always visible. A DB lokal name wins.
//
// There is deliberately NO database trigger on `observations` — keeping the
// fan-out client-invoked means this never touches the insert path the web app
// depends on. Web-created observations keep using the web app's own (web-push)
// fan-out.
//
// Deploy:
//   supabase functions deploy send-bird-alert --project-ref zgnmajovyqibgxlcomvb
// Runtime env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by the
// platform). Set EXPO_ACCESS_TOKEN only if you enable Expo "push security".
// Android delivery additionally needs FCM credentials on the EAS project — see
// the README.
//
// NB: this file is Deno, excluded from the app's tsc/eslint (see tsconfig
// `exclude` + eslint `ignores`).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: 'default';
  channelId: string;
  priority: 'high';
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type AlertObs = {
  id: string;
  user_id: string;
  count: number | null;
  observed_at: string | null;
  species_id: number | null;
  location_id: number | null;
  latitude: number | null;
  longitude: number | null;
  species: { swedish_name?: string } | null;
  location: { name?: string; latitude?: number | null; longitude?: number | null } | null;
};

// Write one durable, denormalized `alerts` row for this larm. Snapshots the
// species/location/observer names + coordinates so the record stays meaningful
// after the source rows are deleted. Idempotent per observation, so an edge-fn
// retry (or an observation already covered by the one-time backfill) never
// doubles a row.
async function logAlert(
  admin: ReturnType<typeof createClient>,
  obs: AlertObs,
  reporter: { display_name?: string | null } | null,
  recipientCount: number,
): Promise<void> {
  const { data: existing } = await admin
    .from('alerts')
    .select('id')
    .eq('observation_id', obs.id)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const loc = obs.location;
  const { error } = await admin.from('alerts').insert({
    observation_id: obs.id,
    location_id: obs.location_id,
    species_id: obs.species_id,
    location_name: loc?.name ?? null,
    species_name: obs.species?.swedish_name ?? null,
    observer_user_id: obs.user_id,
    observer_name: reporter?.display_name ?? null,
    latitude: obs.latitude ?? loc?.latitude ?? null,
    longitude: obs.longitude ?? loc?.longitude ?? null,
    count: obs.count,
    observed_at: obs.observed_at,
    recipient_count: recipientCount,
    // sent_at defaults to now()
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  try {
    const { observationId, placeLabel } = await req.json();
    if (!observationId || typeof observationId !== 'string') {
      return json({ error: 'observationId saknas' }, 400);
    }
    // Client-supplied free text that lands in other members' notifications —
    // collapse to one line and cap the length.
    const clientPlace =
      typeof placeLabel === 'string'
        ? placeLabel.replace(/\s+/g, ' ').trim().slice(0, 80) || undefined
        : undefined;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Service role → RLS bypassed. Load enough to build the notification AND to
    // snapshot a durable `alerts` row (species/location/observer/coords).
    const { data: obs, error: obsErr } = await admin
      .from('observations')
      .select(
        'id,user_id,count,alert_requested,observed_at,species_id,location_id,latitude,longitude,' +
          'species:species(swedish_name),location:locations(name,latitude,longitude)',
      )
      .eq('id', observationId)
      .maybeSingle();
    if (obsErr) throw obsErr;
    if (!obs || !obs.alert_requested) return json({ skipped: true }, 200);

    const { data: reporter } = await admin
      .from('profiles')
      .select('display_name')
      .eq('user_id', obs.user_id)
      .maybeSingle();

    const { data: tokens, error: tokErr } = await admin
      .from('expo_push_tokens')
      .select('token')
      .neq('user_id', obs.user_id);
    if (tokErr) throw tokErr;
    const recipients = (tokens ?? []) as { token: string }[];

    // Preserve the larm as a durable, denormalized record BEFORE delivery — so it
    // survives a push failure, later deletion of the observation, and gives the
    // Lokaler screen its per-lokal larm history. De-duped on observation_id
    // (edge-fn retry + one-time backfill safe). Best-effort: a logging failure must
    // never block the actual fan-out, which is this function's primary job.
    try {
      await logAlert(admin, obs, reporter, recipients.length);
    } catch (logErr) {
      console.error('[send-bird-alert] failed to log alert', logErr);
    }

    if (recipients.length === 0) return json({ sent: 0, logged: true }, 200);

    const species =
      (obs.species as { swedish_name?: string } | null)?.swedish_name ?? 'Ny observation';
    // The place leads the body so the lokal is always visible in the collapsed
    // banner (a combined "Species – Lokal" title truncates on one line). DB lokal
    // name first; the client's geocoded pin label covers coordinate observations.
    const place = (obs.location as { name?: string } | null)?.name ?? clientPlace;
    const who = reporter?.display_name ?? 'en medlem';
    const body = [place, `${obs.count} st`].filter(Boolean).join(' · ') + ` — av ${who}`;

    const messages: ExpoMessage[] = recipients.map((t: { token: string }) => ({
      to: t.token,
      title: species,
      body,
      data: { observationId },
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    }));

    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const dead: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH) {
      const chunk = messages.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(chunk),
      });
      const payload = await res.json().catch(() => null);
      const tickets = payload?.data;
      if (Array.isArray(tickets)) {
        tickets.forEach((ticket: { status?: string; details?: { error?: string } }, j: number) => {
          if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
            dead.push(chunk[j].to);
          }
        });
      }
    }

    // Prune tokens Expo reports as dead so the list stays clean.
    if (dead.length > 0) {
      await admin.from('expo_push_tokens').delete().in('token', dead);
    }

    return json({ sent: messages.length, pruned: dead.length, logged: true }, 200);
  } catch (err) {
    console.error('[send-bird-alert] failed', err);
    return json({ error: 'internt fel' }, 500);
  }
});
