/**
 * A loading placeholder block with a gentle pulse — the modern alternative to a
 * bare spinner: it hints at the shape of the content that's about to arrive. The
 * pulse is pure opacity (no gradient sweep, no extra deps) and is disabled under
 * reduced motion, where it renders as a steady muted block.
 */
import { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Curve, Duration } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  /** When set, height is derived from width via this ratio — for image-shaped
   *  skeletons that must match the real media's box (no layout nudge on load). */
  aspectRatio?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  aspectRatio,
  radius = SurfaceRadius.xs,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const { reduced } = useMotion();
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: Duration.pulse, easing: Curve.inOut }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduced ? 0.6 : pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height: aspectRatio ? undefined : height,
          aspectRatio,
          borderRadius: radius,
          backgroundColor: theme.muted,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A card-shaped skeleton (matches the bordered list rows / stat tiles). */
export function SkeletonCard({
  height = 64,
  style,
}: {
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Skeleton
      height={height}
      radius={SurfaceRadius.md}
      style={[styles.card, { borderColor: theme.border }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.two },
});
