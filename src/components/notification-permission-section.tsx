/**
 * Push-notification row for the Profil screen — a single `SettingsRow` meant to
 * sit inside the "Aviseringar och plats" settings card. A `Switch` reflects the
 * on/off state (granted *and* not opted-out); flipping it requests OS permission
 * + registers this device's Expo token, or records an opt-out and drops the
 * token. When the OS permission is blocked, the row becomes a chevron that deep-
 * links to device settings (the OS won't re-prompt once denied).
 */
import { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { BELL } from '@/components/icon';
import { SettingsRow } from '@/components/settings/settings-row';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import {
  getCachedPushToken,
  getExpoPushToken,
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/lib/notifications';
import { isPushOptedOut, setPushOptedOut } from '@/lib/push-prefs';
import { registerPushToken, unregisterPushToken } from '@/lib/query/push-tokens';

export function NotificationPermissionSection() {
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [optedOut, setOptedOut] = useState<boolean>(() => isPushOptedOut());
  const [busy, setBusy] = useState(false);

  // Read on mount, and re-read when returning from system settings so a flip
  // there reflects back without a manual refresh.
  useEffect(() => {
    let active = true;
    const sync = () => {
      void getNotificationPermission().then((p) => {
        if (active) setPermission(p);
      });
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const enabled = permission === 'granted' && !optedOut;

  async function onEnable() {
    setBusy(true);
    let next = permission;
    if (permission !== 'granted') {
      next = await requestNotificationPermission();
      setPermission(next);
    }
    if (next === 'granted') {
      setPushOptedOut(false);
      setOptedOut(false);
      const token = await getExpoPushToken();
      if (token) {
        try {
          await registerPushToken(token);
          hapticSuccess();
        } catch {
          // best-effort
        }
      }
    }
    setBusy(false);
  }

  async function onDisable() {
    setBusy(true);
    setPushOptedOut(true);
    setOptedOut(true);
    // The session-cached token suffices to delete our row — only fall back to
    // re-minting one from Expo's push service when nothing was cached (also
    // lets the opt-out delete work offline-ish).
    const token = getCachedPushToken() ?? (await getExpoPushToken());
    if (token) {
      try {
        await unregisterPushToken(token);
      } catch {
        // best-effort
      }
    }
    setBusy(false);
  }

  if (permission === 'denied') {
    return (
      <SettingsRow
        icon={BELL}
        label={sv.profile.notifications.title}
        sublabel={sv.profile.status.blocked}
        accessory="chevron"
        onPress={() => void Linking.openSettings()}
      />
    );
  }

  return (
    <SettingsRow
      icon={BELL}
      label={sv.profile.notifications.title}
      accessory="switch"
      switchValue={enabled}
      onSwitchChange={(next) => void (next ? onEnable() : onDisable())}
      disabled={busy}
    />
  );
}
