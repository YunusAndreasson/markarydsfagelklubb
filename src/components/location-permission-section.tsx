/**
 * Location-permission row for the Profil screen — a single `SettingsRow` meant to
 * sit inside the "Aviseringar och plats" settings card. The trailing value shows
 * the current state (På / Av / Blockerad); the chevron triggers the OS prompt
 * when not yet granted, or deep-links to device settings once granted/blocked (the
 * OS won't re-prompt after a denial, and can't be un-granted from inside the app).
 *
 * Permission state is read on mount and re-checked whenever the app returns to the
 * foreground (see `watchGeoPermission`), so flipping it in Settings reflects back.
 */
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { LOCATION } from '@/components/icon';
import { SettingsRow } from '@/components/settings/settings-row';
import { getCurrentPosition, watchGeoPermission, type GeoPermission } from '@/lib/geo';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

export function LocationPermissionSection() {
  const [status, setStatus] = useState<GeoPermission>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => watchGeoPermission(setStatus), []);

  async function onEnable() {
    setBusy(true);
    const result = await getCurrentPosition();
    setBusy(false);
    if (result.ok) {
      setStatus('granted');
      hapticSuccess();
    } else if (result.denied) {
      setStatus('denied');
    }
  }

  const value = busy
    ? '…'
    : status === 'granted'
      ? sv.profile.status.on
      : status === 'denied'
        ? sv.profile.status.blocked
        : sv.profile.status.off;

  // Granted/blocked → manage in device settings (can't un-grant in-app, no
  // re-prompt after a denial); otherwise the chevron triggers the OS prompt.
  const onPress =
    status === 'granted' || status === 'denied'
      ? () => void Linking.openSettings()
      : () => void onEnable();

  return (
    <SettingsRow
      icon={LOCATION}
      label={sv.profile.location.title}
      value={value}
      accessory="chevron"
      onPress={onPress}
      disabled={busy}
    />
  );
}
