import {
  getCachedPushToken, getExpoPushToken, getNotificationPermission, requestNotificationPermission,
} from '@/lib/notifications';
import { isPushOptedOut, setPushOptedOut } from '@/lib/push-prefs';
import { createPushPreferenceSync } from '@/lib/push-preference-sync';
import { registerPushToken, unregisterPushToken } from '@/lib/query/push-tokens';

export const pushRegistration = createPushPreferenceSync({
  readDesired: () => !isPushOptedOut(),
  writeDesired: (enabled) => setPushOptedOut(!enabled),
  permission: getNotificationPermission,
  requestPermission: requestNotificationPermission,
  token: async () => getCachedPushToken() ?? await getExpoPushToken(),
  register: registerPushToken,
  remove: unregisterPushToken,
});

/** Drain any in-flight registration before sign-out deletes its token. */
export async function stopPushRegistration(): Promise<void> {
  pushRegistration.setUser(null);
  await pushRegistration.whenIdle();
}
