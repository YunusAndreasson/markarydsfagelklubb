/**
 * Animated segmented picker — a sliding pill confirms the selection across N
 * mutually-exclusive options. The spring is gated by `useMotion()` so
 * reduced-motion users get an instant snap. The pill rides on a recessed track
 * (Linear's segmented-control idiom: surface contrast, not chrome borders).
 *
 * Used for the Appearance (System/Ljust/Mörkt) picker on the Profil screen; the
 * generic shape is reusable for any small exclusive choice.
 *
 * Reanimated shared-value writes only happen inside `useEffect` and `onLayout` —
 * never from inline JSX prop callbacks — so the React-Compiler
 * `react-hooks/immutability` lint stays clean.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: IconName;
};

export type SegmentedPickerProps<T extends string | number> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  /** Compact rows have icons-only / shorter labels. Defaults to false. */
  compact?: boolean;
};

const PAD = Spacing.half;

export function SegmentedPicker<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  compact = false,
}: SegmentedPickerProps<T>) {
  const theme = useTheme();
  const { reduced } = useMotion();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  // Track inner width is captured on layout; the indicator width and translate
  // derive from it. Using `width-pad*2` keeps a small inset of recessed track
  // visible at the ends so the pill reads as a chip riding *inside* the track.
  const innerWidth = useSharedValue(0);
  const indexSV = useSharedValue(selectedIndex);

  useEffect(() => {
    indexSV.value = reduced ? selectedIndex : withSpring(selectedIndex, Spring.snappy);
  }, [selectedIndex, reduced, indexSV]);

  const indicatorStyle = useAnimatedStyle(() => {
    const pillW = options.length > 0 ? innerWidth.value / options.length : 0;
    return { width: pillW, transform: [{ translateX: indexSV.value * pillW }] };
  });

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={ariaLabel}
      style={[styles.track, { backgroundColor: theme.muted }]}
      // Inline `onLayout` writes the track-inner width to a shared value. This
      // is intentional: wrapping in `useCallback` would make `innerWidth` "a
      // value passed to a hook," which the React-Compiler lint then bans
      // mutating. Inline shared-value writes inside an `onLayout` (native
      // callback, not an inline event-handler) are the documented escape hatch.
      onLayout={(e) => {
        innerWidth.value = e.nativeEvent.layout.width - PAD * 2;
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          indicatorStyle,
        ]}
      />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <PressableScale
            key={String(opt.value)}
            variant="link"
            haptic={false}
            hitSlop={0}
            onPress={() => {
              hapticSelect();
              onChange(opt.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            style={styles.pill}
          >
            {opt.icon ? (
              <Icon
                name={opt.icon}
                size={15}
                color={selected ? theme.foreground : theme.mutedForeground}
              />
            ) : null}
            {!compact || !opt.icon ? (
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.foreground : theme.mutedForeground }}
                numberOfLines={1}
              >
                {opt.label}
              </ThemedText>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: SurfaceRadius.sm,
    padding: PAD,
    position: 'relative',
    // Pills stretch to the track's inner height; keep each ≥44px tappable.
    minHeight: 48,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: SurfaceRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.xs,
  },
});
