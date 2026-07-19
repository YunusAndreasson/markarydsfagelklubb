/**
 * Side-effect-only hook (renders nothing). Mount once, high in the tree.
 *
 * 1. Keeps this device's Expo push token registered — but only when a user is
 *    signed in, has granted OS permission, and hasn't turned notiser off in
 *    Profil. The first enable happens in `NotificationPermissionSection`; this
 *    refreshes the token on every cold start (tokens rotate / change on
 *    reinstall) and re-registers after a sign-in.
 * 2. Routes a notification tap to the observation detail — cold start via
 *    `getLastNotificationResponseAsync`, warm via the response listener. On a
 *    cold start the tap resolves before the navigator (and the observation
 *    route) exists — the root gate renders a spinner until session + profile
 *    settle — so a tap that arrives while `canRoute` is false is HELD and
 *    flushed the moment the app's routes mount, instead of being dropped by a
 *    navigator that can't handle it yet.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getExpoPushToken, getNotificationPermission } from '@/lib/notifications';
import { isPushOptedOut } from '@/lib/push-prefs';
import { registerPushToken } from '@/lib/query/push-tokens';

/**
 * @param canRoute True once the signed-in app routes (the observation detail
 * among them) are actually mounted — session resolved, profile present, gate
 * open. Taps arriving earlier are buffered and flushed when it flips true.
 */
export function usePushRegistration(canRoute: boolean): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const canRouteRef = useRef(canRoute);
  const pendingIdRef = useRef<string | null>(null);

  useEffect(() => {
    canRouteRef.current = canRoute;
    if (canRoute && pendingIdRef.current) {
      const id = pendingIdRef.current;
      pendingIdRef.current = null;
      router.push({ pathname: '/observation/[id]', params: { id } });
    }
  }, [canRoute]);

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

  // Notification taps → the observation detail. Subscribe once; route (or hold)
  // based on whether the target route can exist right now.
  useEffect(() => {
    function handle(response: Notifications.NotificationResponse | null): void {
      if (!response) return;
      const data = response.notification.request.content.data;
      const observationId = typeof data?.observationId === 'string' ? data.observationId : null;
      if (!observationId) return;
      if (canRouteRef.current) {
        router.push({ pathname: '/observation/[id]', params: { id: observationId } });
      } else {
        pendingIdRef.current = observationId;
      }
    }
    void Notifications.getLastNotificationResponseAsync().then(handle);
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, []);
}
