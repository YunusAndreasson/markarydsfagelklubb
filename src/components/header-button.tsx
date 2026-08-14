/**
 * An action for the native navigation bar — the iOS/Android convention for a
 * screen's primary ("Spara") or secondary ("Redigera") action, instead of a
 * button injected into the scroll content. Renders as tinted brand text by
 * default; pass an `icon` to render a bare glyph instead (the iOS/WhatsApp idiom
 * for quick actions like a "+" create or a filter funnel), in which case `title`
 * becomes the accessibility label. Pass `disc` on top of `icon` for the filled
 * brand-green mini-FAB used by a primary create action. Shows a spinner while
 * busy, dims when disabled. Pass via a screen's
 * `Stack.Screen options={{ headerRight: () => <HeaderButton … /> }}`.
 *
 * **Icon actions are a fixed {@link ICON_BOX}-square box on BOTH sides of the
 * bar**, bare or disc, so a left and a right action optically balance. They used
 * to differ (a 26² bare funnel opposite a 32² disc) because the "+" was a
 * bespoke inline copy of this component rather than a caller of it.
 *
 * Sizing note: an SF Symbol does NOT fill its own box. `expo-symbols` pins the
 * view to `size × size`, but the glyph carries the font's ascender/descender
 * margins and aspect-fits *inside* that frame, so on iOS it draws visibly
 * smaller than `size`. Android's Material glyph fills the same box. So the same
 * `size` renders at two different apparent scales, which is why a "+" tuned on
 * Android reads as a small mark floating in dead space on iOS. {@link ICON_GLYPH}
 * therefore differs per platform rather than being one number.
 */
import { type SymbolWeight } from 'expo-symbols';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale, type PressableScaleHaptic } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The square box every icon action occupies — bare glyph or filled disc. */
const ICON_BOX = 32;
/**
 * Glyph size inside {@link ICON_BOX}, per platform — the numbers differ on
 * purpose, because the same number does NOT draw the same size (see the sizing
 * note above). iOS is oversized to offset the SF Symbol's internal inset;
 * Android stays at the Material app-bar standard of 24dp, where the glyph fills
 * its box and 26 would read as oversized.
 */
const ICON_GLYPH = Platform.select({ ios: 26, default: 24 });

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
  /** Override the glyph size inside the box. Defaults to {@link ICON_GLYPH}. */
  iconSize?: number;
  /** SF Symbol weight (iOS), e.g. `heavy` for a bold "+". Ignored on Android. */
  iconWeight?: SymbolWeight;
  /** Fill the box as a solid brand-green circle (the primary create mini-FAB).
   *  Pair with a contrasting `iconColor`. Requires `icon`. */
  disc?: boolean;
  /** Haptic intent. Bar actions are silent by default (the platform already
   *  ticks on navigation); pass `'press'` on a genuinely meaningful one, e.g.
   *  the create action that opens the composer. */
  haptic?: PressableScaleHaptic;
};

export function HeaderButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  iconColor,
  iconSize = ICON_GLYPH,
  iconWeight,
  disc,
  haptic = false,
}: HeaderButtonProps) {
  const theme = useTheme();
  // No internal padding on icon actions — the fixed square box IS the padding,
  // and it's what keeps both sides of the bar the same size. The native header
  // already insets bar items from the screen edge, and the link/icon variants
  // add hitSlop (8/12px), so the tap target clears 44pt either way.
  if (loading) return <ActivityIndicator color={theme.tint} style={styles.text} />;
  return (
    <PressableScale
      // An icon-only action uses the `icon` variant (larger hit-slop, opacity dim
      // on press); a text action stays `link`.
      variant={icon ? 'icon' : 'link'}
      haptic={haptic}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        icon ? styles.iconBox : styles.text,
        disc ? { backgroundColor: theme.tint } : null,
        disabled ? styles.disabled : null,
      ]}
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
  text: { paddingHorizontal: Spacing.half, paddingVertical: Spacing.half },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: ICON_BOX / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
