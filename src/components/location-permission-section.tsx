/**
 * Location-permission section for the Profil screen — the native equivalent of
 * the web `location-permission-section.tsx`. Three states:
 *   • granted  → a quiet confirmation line.
 *   • prompt   → an "Aktivera platsdelning" button that triggers the OS prompt.
 *   • blocked  → a StateBlock that opens the device settings (the OS won't
 *                re-prompt once denied — mirrors edenmind's settings-alert flow).
 *
 * Permission state is read on mount and re-checked whenever the app returns to
 * the foreground (see `watchGeoPermission`), so flipping it in Settings reflects
 * back without a manual refresh.
 */
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { LOCATION } from '@/components/icon';
import { SectionHeader } from '@/components/section-header';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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

  return (
    <View style={styles.section}>
      <SectionHeader title={sv.profile.location.title} caption={sv.profile.location.description} />
      {status === 'granted' ? (
        <ThemedText type="small" themeColor="primary">
          {sv.profile.location.grantedLabel}
        </ThemedText>
      ) : status === 'denied' ? (
        <StateBlock
          icon={LOCATION}
          tone="error"
          title={sv.profile.location.blockedLabel}
          message={sv.profile.location.blockedHelpNative}
          action={{ label: sv.profile.location.openSettings, onPress: () => void Linking.openSettings() }}
        />
      ) : (
        <Button
          title={busy ? sv.profile.location.enabling : sv.profile.location.enableButton}
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
