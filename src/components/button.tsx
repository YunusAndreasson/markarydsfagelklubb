import {
  ActivityIndicator,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PressableScale, type PressableScaleHaptic } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Opacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'tint';
  /** `default` is the 52pt screen CTA; `compact` (40pt) is for inline buttons that
   *  sit in a row of content (an inline "reveal"), not as the page's primary action. */
  size?: 'default' | 'compact';
  loading?: boolean;
  /** Haptic intent on press. Defaults to `'press'` (light); destructive CTAs can
   *  pass `'commit'` for a firmer confirm. */
  haptic?: PressableScaleHaptic;
  style?: StyleProp<ViewStyle>;
};

/**
 * Themed pressable button. `primary` is a filled brand button, `secondary` a
 * bordered/quiet button, `destructive` a filled danger button. While `loading`
 * it shows a spinner and is non-interactive. Press feedback (scale + slight
 * opacity dim, animated release, light haptic) comes from `PressableScale`.
 */
export function Button({
  title,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  haptic,
  accessibilityLabel,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'destructive'
        ? theme.destructive
        : variant === 'tint'
          ? theme.tint
          : 'transparent';
  const labelColor =
    variant === 'secondary'
      ? theme.foreground
      : variant === 'tint'
        ? theme.badgeForeground
        : theme.primaryForeground;

  return (
    <PressableScale
      variant="button"
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        styles.button,
        size === 'compact' && styles.compact,
        { backgroundColor: background },
        variant === 'secondary' && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        isDisabled && styles.dimmed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: labelColor }}>
          {title}
        </ThemedText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: SurfaceRadius.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dimmed: { opacity: Opacity.disabled },
});
