import { useSyncExternalStore } from 'react';
import { Linking } from 'react-native';

import { BELL } from '@/components/icon';
import { SettingsRow } from '@/components/settings/settings-row';
import { sv } from '@/lib/i18n/sv';
import { pushRegistration } from '@/lib/push-registration';

export function NotificationPermissionSection() {
  const state = useSyncExternalStore(pushRegistration.subscribe, pushRegistration.getSnapshot);
  const copy = sv.profile.notifications;
  const message = state.busy
    ? (state.desired ? copy.enabling : copy.disabling)
    : state.error === 'unavailable' ? copy.unavailable
      : state.error === 'enable' ? copy.enableFailed
        : state.error === 'disable' ? copy.disableFailed : undefined;

  return (
    <>
      {state.permission === 'denied' ? (
        <SettingsRow icon={BELL} label={copy.title} sublabel={sv.profile.status.blocked}
          accessory="chevron" onPress={() => void Linking.openSettings()} />
      ) : (
        <SettingsRow icon={BELL} label={copy.title} sublabel={message}
          value={state.confirmed === null || state.error ? copy.unconfirmed : undefined}
          accessory="switch" switchValue={state.confirmed === true}
          onSwitchChange={(next) => void pushRegistration.setEnabled(next)}
          disabled={state.busy} />
      )}
      {state.error ? (
        <SettingsRow label={copy.retry} sublabel={state.permission === 'denied' ? message : undefined}
          action onPress={() => void pushRegistration.sync()} disabled={state.busy} />
      ) : null}
      {state.error && state.desired && state.confirmed !== true ? (
        <SettingsRow label={copy.cancelEnable} action
          onPress={() => void pushRegistration.setEnabled(false)} disabled={state.busy} />
      ) : null}
    </>
  );
}
