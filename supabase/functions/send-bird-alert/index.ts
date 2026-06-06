// Supabase Edge Function (Deno) — send-bird-alert
//
// Fans an observation out to every member's device EXCEPT the reporter's, via
// the Expo push service. Invoked by the native client (fire-and-forget) right
// after a successful insert:
//
//   supabase.functions.invoke('send-bird-alert', { body: { observationId } })
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

Deno.serve(async (req) => {
  try {
    const { observationId } = await req.json();
    if (!observationId || typeof observationId !== 'string') {
      return json({ error: 'observationId saknas' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Service role → RLS bypassed. Load just enough to build the notification.
    const { data: obs, error: obsErr } = await admin
      .from('observations')
      .select('id,user_id,count,alert_requested,species:species(swedish_name),location:locations(name)')
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
    if (!tokens || tokens.length === 0) return json({ sent: 0 }, 200);

    const species =
      (obs.species as { swedish_name?: string } | null)?.swedish_name ?? 'Ny observation';
    const place = (obs.location as { name?: string } | null)?.name;
    const who = reporter?.display_name ?? 'en medlem';
    const body = [`${obs.count} st`, place].filter(Boolean).join(' · ') + ` — av ${who}`;

    const messages: ExpoMessage[] = tokens.map((t: { token: string }) => ({
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

    return json({ sent: messages.length, pruned: dead.length }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
