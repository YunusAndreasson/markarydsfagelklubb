/**
 * Side-effect-only hook (renders nothing). Mount once, high in the tree.
 *
 * 1. Keeps this device's Expo push token registered — but only when a user is
 *    signed in, has granted OS permission, and hasn't turned notiser off in
 *    Profil. The first enable happens in `NotificationPermissionSection`; this
 *    refreshes the token on every cold start (tokens rotate / change on
 *    reinstall) and re-registers after a sign-in.
 * 2. Routes a notification tap to the observation detail, via expo-notifications'
 *    own `useLastNotificationResponse`. That single hook covers BOTH the tap that
 *    launched the app from a killed state and taps while it runs, and it dedupes
 *    them — so we no longer pair `getLastNotificationResponseAsync()` with a
 *    response listener, which could deliver the *same* cold-start tap twice and
 *    push the detail screen twice.
 *
 *    Because the response is React state, waiting is all the fix a cold start
 *    needs. The tap resolves long before the navigator exists — the root gate
 *    renders a spinner (no `<Stack>`) until session + profile settle — and
 *    `router.push` THROWS in that window ("Attempted to navigate before mounting
 *    the Root Layout component") — and a throw out of a notification callback is
 *    a fatal, uncaught JS error in a release build. `canRoute` defers the
 *    navigation to the first render where the routes actually exist, and
 *    `clearLastNotificationResponseAsync` drops the handled response so a later
 *    remount can't silently re-navigate to it.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getExpoPushToken, getNotificationPermission } from '@/lib/notifications';
import { isPushOptedOut } from '@/lib/push-prefs';
import { registerPushToken } from '@/lib/query/push-tokens';

/**
 * @param canRoute True once the signed-in app routes (the observation detail
 * among them) are actually mounted — session resolved, profile present, gate
 * open. A tap that arrives earlier is held as state and routed when it flips.
 */
export function usePushRegistration(canRoute: boolean): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // (Re)register when signed in + granted + not opted out.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const permission = await getNotificationPermission();
      if (cancelled || permission !== 'granted' || isPushOptedOut()) return;
      const token = await getExpoPushToken();
      if (cancelled || !token) return;
      try {
        await registerPushToken(token);
      } catch {
        // Best-effort — a failed upsert just means no pushes until next launch.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Notification taps → the observation detail, once the routes exist.
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!canRoute || !response) return;
    const data = response.notification.request.content.data;
    const observationId = typeof data?.observationId === 'string' ? data.observationId : null;
    // A placeless "Larm härifrån" alert carries no observation — there is nothing
    // to open, so the tap just brings the app to the foreground.
    if (!observationId) return;
    Notifications.clearLastNotificationResponse();
    router.push({ pathname: '/observation/[id]', params: { id: observationId } });
  }, [canRoute, response]);
}
