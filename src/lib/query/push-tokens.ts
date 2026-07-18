/**
 * Direct-Supabase access for the device's Expo push token + the alert fan-out
 * trigger. Mirrors the other `query/*` data modules (owner-scoped writes; RLS is
 * the boundary). Distinct from the web `push_subscriptions` table, which is Web
 * Push (VAPID) — Expo uses its own token + push service.
 */
import { Platform } from 'react-native';

import { getCachedPushToken } from '@/lib/notifications';
import { requireUserId } from '@/lib/query/session';
import { supabase } from '@/lib/supabase';

/** Upsert this device's Expo push token for the signed-in user. */
export async function registerPushToken(token: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('expo_push_tokens').upsert(
    {
      token,
      user_id: userId,
      platform: Platform.OS,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );
  if (error) throw error;
}

/** Remove a device token (stop delivery to it). */
export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.from('expo_push_tokens').delete().eq('token', token);
  if (error) throw error;
}

/**
 * Best-effort removal of THIS device's token. Call while the session is still
 * valid (e.g. just before sign-out) — the owner-scoped RLS delete needs the
 * user's auth. Uses the cached token to avoid a round-trip to Expo.
 */
export async function unregisterCurrentDeviceToken(): Promise<void> {
  const token = getCachedPushToken();
  if (token) await unregisterPushToken(token);
}

/**
 * Ask the `send-bird-alert` edge function to fan a freshly created observation
 * out to every other member's device. Fire-and-forget at the call site; a
 * not-yet-deployed function must never block the create flow. Web-created
 * observations keep using the web app's own (web-push) fan-out.
 *
 * `placeLabel` names the place for pin-drop observations, which have no lokal
 * row for the function to read — pass the reverse-geocoded label so the
 * notification still shows where. Ignored server-side when a lokal exists.
 */
export async function requestBirdAlert(
  observationId: string,
  placeLabel?: string | null,
): Promise<void> {
  // Local-QA safety valve: driving the create flow repeatedly on a dev build
  // would otherwise blast every real club member's device with push alerts. A
  // connected debugger can set `globalThis.__mafkSuppressAlertFanout = true` to
  // skip the real fan-out (the call is still exercised up to this point). The
  // `__DEV__` guard dead-code-eliminates this from release bundles, so shipped
  // behaviour is unchanged.
  if (
    __DEV__ &&
    (globalThis as { __mafkSuppressAlertFanout?: boolean }).__mafkSuppressAlertFanout
  ) {
    console.log('[QA] send-bird-alert fan-out suppressed for', observationId, placeLabel ?? '');
    return;
  }
  const { error } = await supabase.functions.invoke('send-bird-alert', {
    body: { observationId, ...(placeLabel ? { placeLabel } : {}) },
  });
  if (error) throw error;
}
