/**
 * Push-notification section for the Profil screen — the native equivalent of the
 * web `push-notification-toggle`. Three states:
 *   • on      → a quiet "Notiser är på" line + a "Stäng av notiser" button.
 *   • prompt  → an "Aktivera notiser" button that requests OS permission and
 *               registers this device's Expo token.
 *   • blocked → a StateBlock that opens device settings (the OS won't re-prompt
 *               once denied).
 *
 * "Off" can't un-grant the OS permission, so it records an opt-out
 * (`push-prefs`) and drops this device's token — the auto-registration hook
 * honours the flag so a cold start doesn't silently re-subscribe.
 */
import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ALERT } from '@/components/icon';
import { SectionHeader } from '@/components/section-header';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import {
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
    const token = await getExpoPushToken();
    if (token) {
      try {
        await unregisterPushToken(token);
      } catch {
        // best-effort
      }
    }
    setBusy(false);
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        title={sv.profile.notifications.title}
        caption={sv.profile.notifications.description}
      />
      {permission === 'denied' ? (
        <StateBlock
          icon={ALERT}
          tone="error"
          title={sv.profile.notifications.blockedLabel}
          message={sv.profile.notifications.blockedHelpNative}
          action={{
            label: sv.profile.notifications.openSettings,
            onPress: () => void Linking.openSettings(),
          }}
        />
      ) : enabled ? (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="primary">
            {sv.profile.notifications.enabledLabel}
          </ThemedText>
          <Button
            title={busy ? sv.profile.notifications.disabling : sv.profile.notifications.disableButton}
            variant="secondary"
            loading={busy}
            onPress={() => void onDisable()}
          />
        </View>
      ) : (
        <Button
          title={busy ? sv.profile.notifications.enabling : sv.profile.notifications.enableButton}
          variant="secondary"
          loading={busy}
          onPress={() => void onEnable()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
});
