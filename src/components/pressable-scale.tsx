/**
 * The app's press-feedback primitive — one place that owns how a tap *feels*.
 * Variants name the visual language; the rhythm (instant press-down, ~80ms eased
 * release on scale, synchronous on bg/opacity) is fixed so every interactive
 * surface lands the same way. Notion/Linear discipline: press feels immediate,
 * release reads as polish.
 *
 *  - `button` — scale + slight opacity dim (the default app rhythm).
 *  - `card`   — gentle scale depression + optional background tint (caller passes
 *               `pressedBackgroundColor`). The scale alone makes a press *felt* even
 *               on image/hero cards that have no tintable surface of their own.
 *  - `row`    — same as `card`; reads as a list row.
 *  - `icon`   — opacity dim + `HitSlop.icon` (icon-only chrome buttons).
 *  - `link`   — opacity dim + `HitSlop.compact` (inline text actions).
 *
 * Haptic intent is named, not raw: `'press' | 'select' | 'commit' | false`.
 * Under reduced motion the scale drops; the opacity dim stays so users still
 * feel the press.
 *
 * Important: the *animated* path (anything with a scale, i.e. variant=button or
 * an explicit `pressScale`) must pass a **static** `style` array to the
 * underlying `AnimatedPressable`. Reanimated's `createAnimatedComponent` wraps
 * Pressable and silently drops the function-form `style={({pressed}) => ...}`
 * callback when the component sits inside a Reanimated-animated parent
 * (`Animated.View` with `layout`, `ReanimatedSwipeable`, etc). Symptom: the
 * Pressable renders with *none* of the passed styles — no flex, no minHeight,
 * no background, no border — while child text still styles fine. So all
 * press-time visuals (scale, opacity, pressedBackgroundColor) are driven from
 * a single `useAnimatedStyle` here instead of from the `({pressed}) => [...]`
 * callback.
 */
import { useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Curve, Duration, HitSlop } from '@/constants/motion';
import { useMotion } from '@/hooks/use-motion';
import { hapticCommit, hapticPress, hapticSelect } from '@/lib/haptics';

export type PressableScaleVariant = 'button' | 'card' | 'row' | 'icon' | 'link';
export type PressableScaleHaptic = 'press' | 'select' | 'commit' | false;

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  children?: PressableProps['children'];
  onPress?: PressableProps['onPress'];
  /** Static style. Callers no longer need a `({pressed}) => ...` callback —
   *  the variant owns press feedback. */
  style?: StyleProp<ViewStyle>;
  variant?: PressableScaleVariant;
  /** Haptic intent fired on press. Defaults to `'press'`. */
  haptic?: PressableScaleHaptic;
  /** Override the variant's default press scale (e.g. so high-frequency taps
   *  don't fatigue the hand). */
  pressScale?: number;
  /** Background while pressed. Optional tint layered over the `card`/`row` scale
   *  — pass it on surfaces that have their own background to tint (list rows);
   *  omit it on image/hero cards where the scale is the feedback. */
  pressedBackgroundColor?: string;
  /** The surface's own background, returned to when NOT pressed. Reanimated does
   *  not revert a property that's merely omitted between frames — it keeps the last
   *  applied value — so when a caller tints with `pressedBackgroundColor` we must
   *  always return a concrete resting color (else the tint sticks, e.g. after a tap
   *  navigates away). Defaults to `'transparent'` (correct for rows with no own bg);
   *  surfaces with a background (e.g. ListCard) pass their card color. */
  restingBackgroundColor?: string;
};

const VARIANT_DEFAULTS: Record<
  PressableScaleVariant,
  { scale?: number; opacity?: number; hitSlop?: number }
> = {
  button: { scale: 0.97, opacity: 0.94 },
  // Cards/rows depress gently (0.98 — subtler than a button, since a large
  // surface moving less still reads as "alive"). The pressed bg tint, when a
  // caller passes one, layers on top via `animatedStyle`.
  card: { scale: 0.98 },
  row: { scale: 0.98 },
  icon: { opacity: 0.6, hitSlop: HitSlop.icon },
  link: { opacity: 0.6, hitSlop: HitSlop.compact },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  variant = 'button',
  haptic = 'press',
  pressScale,
  pressedBackgroundColor,
  restingBackgroundColor = 'transparent',
  hitSlop,
  onPress,
  onPressIn,
  onPressOut,
  style,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const { reduced } = useMotion();
  const defaults = VARIANT_DEFAULTS[variant];
  const effectiveScale = pressScale ?? defaults.scale;
  const effectiveOpacity = defaults.opacity;
  const effectiveHitSlop = hitSlop ?? defaults.hitSlop;

  // Two shared values so scale/opacity can ease back over 80ms while the
  // pressed-bg snaps on/off instantly (matches the iOS Mail / Linear feel —
  // background flash is binary, scale settles smoothly).
  const pressedSV = useSharedValue(0);
  const pressedBgSV = useSharedValue(0);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (haptic === 'press') hapticPress();
      else if (haptic === 'select') hapticSelect();
      else if (haptic === 'commit') hapticCommit();
      onPress?.(event);
    },
    [haptic, onPress],
  );

  // Scale variants animate the release; everyone else uses Pressable's
  // synchronous `pressed` flag for bg/opacity (instant in *and* out, the right
  // feel for a tinted row or a dimmed icon).
  const useAnimated = effectiveScale !== undefined && !reduced;

  const animatedStyle = useAnimatedStyle(() => {
    if (!useAnimated) return {};
    const p = pressedSV.value;
    const base: { transform: { scale: number }[]; opacity: number; backgroundColor?: string } = {
      transform: [{ scale: 1 - (1 - (effectiveScale ?? 1)) * p }],
      opacity: effectiveOpacity !== undefined ? 1 - (1 - effectiveOpacity) * p : 1,
    };
    // Always return a concrete backgroundColor when a tint is in play — omitting
    // it on release does NOT revert in Reanimated (it keeps the last value), which
    // left the tint stuck after the press ended.
    if (pressedBackgroundColor) {
      base.backgroundColor =
        pressedBgSV.value === 1 ? pressedBackgroundColor : restingBackgroundColor;
    }
    return base;
  });

  if (useAnimated) {
    return (
      <AnimatedPressable
        onPress={(e) => {
          handlePress(e);
          // Release here too: when onPress navigates away, the native onPressOut
          // can be dropped (the underlying screen freezes/transitions before the
          // touch ends), leaving the row stuck scaled + tinted — and that stale
          // tint then mis-renders after a theme switch (a light pill in dark
          // mode, etc). Resetting on press guarantees the row always clears.
          pressedSV.value = withTiming(0, { duration: Duration.instant, easing: Curve.out });
          pressedBgSV.value = 0;
        }}
        onPressIn={(e) => {
          pressedSV.value = 1;
          pressedBgSV.value = 1;
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          pressedSV.value = withTiming(0, { duration: Duration.instant, easing: Curve.out });
          pressedBgSV.value = 0;
          onPressOut?.(e);
        }}
        hitSlop={effectiveHitSlop}
        disabled={disabled}
        // STATIC style array — see the file-header note. A function form
        // (`({pressed}) => [...]`) silently breaks inside Reanimated-animated
        // parents because `createAnimatedComponent` strips it. All press-time
        // visuals are routed through `animatedStyle` instead.
        style={[style, animatedStyle]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={effectiveHitSlop}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        pressed && pressedBackgroundColor ? { backgroundColor: pressedBackgroundColor } : null,
        pressed && effectiveOpacity !== undefined ? { opacity: effectiveOpacity } : null,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
