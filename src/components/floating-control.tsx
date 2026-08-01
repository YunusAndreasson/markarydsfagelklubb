/**
 * Floating controls that sit *on top of* full-bleed content — a fullscreen photo,
 * a fullscreen map, the Lokaler map. Four screens had each grown their own copy of
 * the same 44pt bordered disc, and one had drifted onto a hardcoded corner radius,
 * so a "close" button looked subtly different depending on which viewer you were
 * in. This is the one recipe.
 *
 * Positioning stays at the call site (`top: insets.top + …` for a close button,
 * `bottom: …` for the map's "visa alla"), because only the caller knows which edge
 * it belongs to and which inset applies. Everything else — size, disc, card fill,
 * hairline border, centering — comes from here.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * ≥44pt visible target (Apple HIG / Material). Deliberately independent of the
 * `icon` variant's hitSlop: a viewer's primary control should be easy to *see* and
 * hit, not just generously padded.
 */
export const FLOATING_CONTROL_SIZE = 44;

export function FloatingIconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = IconSize.close,
  style,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  /** Glyph size inside the disc. Defaults to the sheet/fullscreen close size. */
  size?: number;
  /** Positioning (which edge, which inset) — supplied by the caller. */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      variant="icon"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.disc, { backgroundColor: theme.card, borderColor: theme.border }, style]}
    >
      <Icon name={icon} size={size} color={theme.foreground} />
    </PressableScale>
  );
}

/**
 * The corner signifier on an inline preview that says "tap to see this bigger"
 * (Norman: the affordance needs a visible sign). Shared by the observation photo
 * and the observation map so the two read as one interaction vocabulary.
 * Non-interactive — the whole preview owns the tap.
 */
export function ExpandBadge({ icon, children }: { icon?: IconName; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border }]}
      pointerEvents="none"
    >
      {icon ? <Icon name={icon} size={IconSize.meta} color={theme.foreground} /> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    position: 'absolute',
    width: FLOATING_CONTROL_SIZE,
    height: FLOATING_CONTROL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SurfaceRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    padding: Spacing.one,
    borderRadius: SurfaceRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
