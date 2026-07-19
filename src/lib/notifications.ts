/**
 * Thin wrapper around `expo-notifications` for remote (Expo) push — the native
 * replacement for the web app's Web Push. Pure plumbing: no React, no Supabase.
 *
 * Delivery model: the device registers an `ExponentPushToken` (persisted in
 * `expo_push_tokens` via `@/lib/query/push-tokens`); the `send-bird-alert` edge
 * function POSTs to Expo's push service, which routes to FCM (Android) / APNs.
 *
 * SDK 56 notes: `getExpoPushTokenAsync` needs an EAS `projectId` (run `eas init`
 * to populate `extra.eas.projectId`); remote push requires a dev/standalone build
 * (unavailable in Expo Go on Android since SDK 53) and a real device. The
 * foreground handler uses `shouldShowBanner`/`shouldShowList` (the removed
 * `shouldShowAlert` is gone).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';

/** Brand green — Android small-icon tint + channel light. Matches the plugin. */
const ACCENT = Colors.light.primary;
const ANDROID_CHANNEL_ID = 'default';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

let handlerConfigured = false;
let cachedToken: string | null = null;

/** Set the foreground presentation behaviour once. Safe to call repeatedly. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function classify(status: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  // No grant + can't ask again ⇒ the user must flip it in system settings.
  return status.canAskAgain ? 'undetermined' : 'denied';
}

/** Current permission, without prompting. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  return classify(await Notifications.getPermissionsAsync());
}

/** Prompt once if still askable; returns the resulting permission. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  return classify(await Notifications.requestPermissionsAsync());
}

/**
 * Android needs an explicit channel for heads-up delivery (no-op elsewhere).
 *
 * SOUND — the channel intentionally OMITS `sound`, which is how you request the
 * *standard* notification sound. On Android 8+ the sound is a per-channel
 * property, and expo-notifications only calls `setSound` when a `sound` key is
 * present; with it absent the channel keeps `Settings.System.DEFAULT_NOTIFICATION_URI`
 * (the system default), and `importance: HIGH` keeps that sound audible.
 * ⚠️ Do NOT add `sound: 'default'` here — that string is treated as a res/raw
 * FILENAME, and with no `res/raw/default` it resolves to SILENCE. Omission is the
 * only way to get the default. (The push payload also sends `sound: 'default'`
 * and the foreground handler sets `shouldPlaySound: true`, so a standard sound
 * plays whether the app is foreground, background, or killed.)
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Fågelnotiser',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: ACCENT,
  });
}

/** The last token fetched this session (for a network-free sign-out cleanup). */
export function getCachedPushToken(): string | null {
  return cachedToken;
}

function getProjectId(): string | null {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null;
}

/**
 * Fetch this device's Expo push token, or null when it can't be obtained —
 * a simulator/emulator (`!Device.isDevice`), a missing EAS projectId, or an
 * Expo error. Callers treat null as "no push on this device" and move on.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] Saknar EAS projectId (kör `eas init`) — hoppar över push-registrering.');
    return null;
  }
  await ensureAndroidChannel();
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedToken = data;
    return data;
  } catch (err) {
    console.warn('[push] Kunde inte hämta Expo push-token', err);
    return null;
  }
}
