/**
 * Returns the active color palette. Reads the resolved scheme from
 * `ThemeModeProvider` (which honors the user's light/dark/system choice), so an
 * in-app override takes effect immediately.
 *
 * Learn more about light and dark modes:
 * https://docs.expo.dev/develop/user-interface/color-themes/
 */

import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/hooks/use-theme-mode';

export function useTheme() {
  const { colorScheme } = useThemeMode();

  return Colors[colorScheme];
}
