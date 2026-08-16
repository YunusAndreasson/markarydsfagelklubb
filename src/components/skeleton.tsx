/**
 * Loading placeholders — the primitive plus the named shapes screens actually use.
 *
 * Three rules this file exists to enforce:
 *
 *  1. **A skeleton is a tracing of the real thing, not a grey box.** Its bars sit
 *     at the same sizes, gaps and paddings as the content that replaces them, so
 *     the swap is invisible instead of a reflow. That's why `SkeletonLine` takes a
 *     `ThemedText` type rather than a pixel height, and why `ObservationCardSkeleton`
 *     rebuilds the feed card's geometry from the same tokens the card uses.
 *  2. **It errs shorter, never taller.** Content growing into place is calm;
 *     content collapsing yanks the page up under the reader's eye. Hence no photo
 *     slot on the feed card skeleton — a photo is optional on an observation, and
 *     reserving space for one that never arrives is the jarring direction.
 *  3. **It is never a flicker.** Timing is not this file's job — see
 *     `useDelayedFlag`, which every call site goes through.
 *
 * The pulse is pure opacity (no gradient sweep, no extra deps): a sweeping shimmer
 * reads as a decorative animation competing for attention, where a slow breath
 * reads as "not ready yet". Disabled under reduced motion, where it renders as a
 * steady muted block. All of it is hidden from assistive tech — a screen reader
 * should hear nothing until there is something to say.
 */
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Curve, Duration } from '@/constants/motion';
import { AvatarSize, elevationStyle, SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Elevation, Spacing } from '@/constants/theme';
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

/**
 * Text sizes the app actually renders, mirrored from `ThemedText`. A skeleton bar
 * that stands in for a line of text has to occupy the line's full height — not
 * just the bar's — or every gap below it shifts when the real text lands.
 */
const TEXT_METRICS = {
  small: { bar: 10, line: 20 },
  smallBold: { bar: 10, line: 20 },
  default: { bar: 12, line: 24 },
  heading: { bar: 14, line: 24 },
  card: { bar: 20, line: 36 },
} as const;

export type SkeletonLineType = keyof typeof TEXT_METRICS;

/**
 * One line of placeholder text. Reserves the real line box and draws a bar a
 * little shorter inside it, the way a lowercase word sits inside its leading —
 * so a stack of these has the exact rhythm of the paragraph it replaces.
 */
export function SkeletonLine({
  type = 'default',
  width = '100%',
  style,
}: {
  type?: SkeletonLineType;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) {
  const { bar, line } = TEXT_METRICS[type];
  return (
    <View style={[{ height: line }, styles.lineBox, style]}>
      <Skeleton width={width} height={bar} radius={bar / 2} />
    </View>
  );
}

/**
 * The `SelectRow` shape — same 52pt minimum, 16pt inset and 8pt gap — for the
 * picker sheets and the blocked-member list, which are all that row with
 * different leading slots.
 *
 * Widths alternate off `index` so a stack of them reads as a *list of different
 * things* rather than a barcode. Uniform bars are the tell that gives cheap
 * skeletons away.
 */
export function SkeletonSelectRow({
  index = 0,
  leading = 'none',
  secondary = false,
  size = 'default',
}: {
  /** Position in the stack — varies the bar widths. */
  index?: number;
  /** Leading slot: an avatar disc, a checkbox square, or nothing. */
  leading?: 'avatar' | 'checkbox' | 'none';
  /** Reserve the muted second line (species scientific names, row metadata). */
  secondary?: boolean;
  /** Match `SelectRow`'s own `size` — `tall` for the two-line species rows. */
  size?: 'default' | 'tall';
}) {
  const primaryWidths = ['62%', '48%', '71%', '55%'] as const;
  const secondaryWidths = ['40%', '33%', '46%', '37%'] as const;
  return (
    <View style={[styles.selectRow, size === 'tall' && styles.selectRowTall]}>
      {leading === 'avatar' ? (
        <Skeleton width={AvatarSize.sm} height={AvatarSize.sm} radius={AvatarSize.sm / 2} />
      ) : leading === 'checkbox' ? (
        <Skeleton width={20} height={20} radius={SurfaceRadius.xs} />
      ) : null}
      <View style={styles.selectRowBody}>
        <SkeletonLine
          type={secondary ? 'smallBold' : 'default'}
          width={primaryWidths[index % primaryWidths.length]}
        />
        {secondary ? (
          <SkeletonLine
            type="small"
            width={secondaryWidths[index % secondaryWidths.length]}
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * The feed card, traced. Geometry is lifted from `ObservationCard` — same radius,
 * elevation, hairline clip, 16pt content padding, 8pt gaps and 44pt footer — so
 * the real card lands exactly where its placeholder stood.
 *
 * No photo slot, deliberately: see rule 2 in the file header.
 */
export function ObservationCardSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.feedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.feedContent}>
        <View style={styles.feedHeader}>
          {/* Species name — the card's hero, flush left. Flexes like the real
              title so the percentage resolves against the card, not the bar. */}
          <SkeletonLine type="heading" width="55%" style={styles.feedTitle} />
          {/* Rarity grade + time-ago cluster, top right. */}
          <Skeleton width={22} height={22} radius={SurfaceRadius.xs} />
          <SkeletonLine type="smallBold" width={44} />
        </View>
        <SkeletonLine type="smallBold" width="45%" />
        <SkeletonLine type="small" width="35%" />
      </View>
      <View style={[styles.feedFooter, { borderTopColor: theme.border }]}>
        <Skeleton width={AvatarSize.sm} height={AvatarSize.sm} radius={AvatarSize.sm / 2} />
        <SkeletonLine type="small" width="40%" style={styles.feedFooterName} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.two },
  lineBox: { justifyContent: 'center' },
  // Mirrors `SelectRow`'s geometry exactly.
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  selectRowTall: { minHeight: 64 },
  selectRowBody: { flex: 1, gap: Spacing.half },
  // Mirrors `ObservationCard`'s outer shadow + inner clip in one view: the
  // skeleton has no full-bleed image to clip, so it doesn't need the two-layer
  // split the real card does.
  feedCard: {
    ...SurfaceStyles.clippedCard,
    ...elevationStyle(Elevation.raised),
  },
  feedContent: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.two },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  feedTitle: { flex: 1 },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    marginTop: Spacing.three,
    minHeight: 44,
  },
  feedFooterName: { flex: 1 },
});
