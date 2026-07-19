/**
 * An action for the native navigation bar — the iOS/Android convention for a
 * screen's primary ("Spara") or secondary ("Redigera") action, instead of a
 * button injected into the scroll content. Renders as tinted brand text by
 * default; pass an `icon` to render a bare glyph instead (the iOS/WhatsApp idiom
 * for quick actions like a "+" create or a filter funnel), in which case `title`
 * becomes the accessibility label. Shows a spinner while busy, dims when
 * disabled. Pass via a screen's
 * `Stack.Screen options={{ headerRight: () => <HeaderButton … /> }}`.
 */
import { type SymbolWeight } from 'expo-symbols';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeaderButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** When set, render this glyph instead of the text label; `title` stays the
   *  accessibility label. */
  icon?: IconName;
  /** Glyph tint (defaults to the brand tint). */
  iconColor?: string;
  /** Glyph size — a touch larger than body text so a bare glyph reads as a tap
   *  target. */
  iconSize?: number;
  /** SF Symbol weight (iOS), e.g. `heavy` for a bold "+". Ignored on Android. */
  iconWeight?: SymbolWeight;
};

export function HeaderButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  iconColor,
  iconSize = 22,
  iconWeight,
}: HeaderButtonProps) {
  const theme = useTheme();
  // Minimal internal padding — the button hugs its label/glyph as tightly as the
  // compact "+" create disc. The native header already insets bar items from the
  // screen edge, and the link/icon variants add hitSlop (8/12px), so the tap
  // target stays comfortable even though the visible padding is tiny.
  if (loading) return <ActivityIndicator color={theme.tint} style={styles.button} />;
  return (
    <PressableScale
      // An icon-only action uses the `icon` variant (larger hit-slop, opacity dim
      // on press); a text action stays `link`.
      variant={icon ? 'icon' : 'link'}
      haptic={false}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.button, disabled ? styles.disabled : null]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize} weight={iconWeight} color={iconColor ?? theme.tint} />
      ) : (
        <ThemedText type="smallBold" themeColor="tint" numberOfLines={1}>
          {title}
        </ThemedText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: Spacing.half, paddingVertical: Spacing.half },
  disabled: { opacity: 0.4 },
});
