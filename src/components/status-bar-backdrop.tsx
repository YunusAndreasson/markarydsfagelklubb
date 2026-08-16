/**
 * An opaque themed band behind the status bar, for the screens whose content
 * runs edge-to-edge underneath it.
 *
 * The two map screens (the Lokaler tab and the report picker's full-screen
 * placement map) deliberately have no opaque header, so Google's tiles run all
 * the way up behind the clock, battery and signal glyphs. Those glyphs are drawn
 * by the OS in one colour, chosen from the app's theme — and map tiles are not
 * the app's theme. Measured on device: 1.45:1 in light mode and 1.15:1 in dark
 * (white glyphs on pale green land), against the 4.5:1 the rest of the app holds.
 * Dark mode was the worse case precisely because the base map stays light no
 * matter which theme the app is in.
 *
 * The fix is to give the glyphs the surface they were picked against. `insets.top`
 * is exactly the strip the OS draws into, so the map loses nothing it was using,
 * and on a device with no top inset this renders nothing at all.
 */
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  if (insets.top === 0) return null;

  return (
    <View
      // Purely decorative — must never intercept a map pan that starts up here.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.band, { height: insets.top, backgroundColor: theme.background }]}
    />
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: 0, left: 0, right: 0 },
});
