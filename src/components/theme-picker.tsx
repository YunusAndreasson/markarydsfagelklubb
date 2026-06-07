/**
 * Appearance group — System / Ljust / Mörkt as checkmark rows inside a settings
 * card (the row-based grammar of the 2026 grouped-settings refresh). Mirrors the
 * web's appearance control but adds the native `system` option (follow the OS).
 * Persistence + native propagation live in `useThemeMode`; this is purely the
 * control surface.
 */
import { type IconName } from '@/components/icon';
import { SettingsGroup } from '@/components/settings/settings-group';
import { SettingsRow } from '@/components/settings/settings-row';
import { useThemeMode, type ThemeMode } from '@/hooks/use-theme-mode';
import { sv } from '@/lib/i18n/sv';

const THEME_OPTIONS: readonly { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'system', label: sv.theme.system, icon: { sf: 'circle.lefthalf.filled', material: 'contrast' } },
  { value: 'light', label: sv.theme.light, icon: { sf: 'sun.max', material: 'light-mode' } },
  { value: 'dark', label: sv.theme.dark, icon: { sf: 'moon', material: 'dark-mode' } },
];

export function ThemePicker() {
  const { mode, setMode } = useThemeMode();
  return (
    <SettingsGroup title={sv.theme.sectionTitle} caption={sv.theme.sectionDescription}>
      {THEME_OPTIONS.map((opt) => (
        <SettingsRow
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          accessory="check"
          selected={mode === opt.value}
          onPress={() => setMode(opt.value)}
        />
      ))}
    </SettingsGroup>
  );
}
