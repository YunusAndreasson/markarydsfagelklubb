/**
 * Appearance section — System / Ljust / Mörkt as a segmented control bound to the
 * app-wide theme mode. Mirrors the web's `ThemePicker`, but the native app adds
 * the `system` option (follow the OS) that the web omits. Persistence + native
 * propagation live in `useThemeMode`; this is purely the control surface.
 */
import { View, StyleSheet } from 'react-native';

import { SectionHeader } from '@/components/section-header';
import { SegmentedPicker, type SegmentedOption } from '@/components/segmented-picker';
import { Spacing } from '@/constants/theme';
import { useThemeMode, type ThemeMode } from '@/hooks/use-theme-mode';
import { sv } from '@/lib/i18n/sv';

const THEME_OPTIONS: readonly SegmentedOption<ThemeMode>[] = [
  { value: 'system', label: sv.theme.system, icon: { sf: 'circle.lefthalf.filled', material: 'contrast' } },
  { value: 'light', label: sv.theme.light, icon: { sf: 'sun.max', material: 'light-mode' } },
  { value: 'dark', label: sv.theme.dark, icon: { sf: 'moon', material: 'dark-mode' } },
];

export function ThemePicker() {
  const { mode, setMode } = useThemeMode();
  return (
    <View style={styles.section}>
      <SectionHeader title={sv.theme.sectionTitle} caption={sv.theme.sectionDescription} />
      <SegmentedPicker
        options={THEME_OPTIONS}
        value={mode}
        onChange={setMode}
        ariaLabel={sv.theme.sectionTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
});
