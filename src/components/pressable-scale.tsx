/**
 * The app's press-feedback primitive — one place that owns how a tap *feels*.
 * Variants name the visual language; the rhythm (one interruptible spring in and
 * out on scale, synchronous on the bg tint) is fixed so every interactive surface
 * lands the same way. Notion/Linear discipline: the surface sinks like it has
 * mass, and settles instead of snapping back.
 *
 *  - `button` — scale + slight opacity dim (the default app rhythm).
 *  - `card`   — gentle scale depression + optional background tint (caller passes
 *               `pressedBackgroundColor`). The scale alone makes a press *felt* even
 *               on image/hero cards that have no tintable surface of their own.
 *  - `row`    — same as `card`; reads as a list row.
 *  - `icon`   — opacity dim + `HitSlop.icon` (icon-only chrome buttons).
 *  - `link`   — opacity dim + `HitSlop.compact` (inline text actions).
 *
 * Two rhythms the variants also carry:
 *
 *  - **Press delay.** `card`/`row` live inside scroll views, so they wait
 *    `PressDelay.scrollSurface` before showing anything — otherwise the finger you
 *    put down to scroll lights up whatever card it landed on. Chrome is immediate.
 *  - **Haptics.** Named, not raw: `'press' | 'select' | 'commit' | false`, and
 *    **variant-derived by default**. Only `button` buzzes; `card`/`row`/`icon`/
 *    `link` are silent, because those surfaces navigate, and a haptic's job is to
 *    confirm a state change the system made (a selection, a toggle, a commit, a
 *    failure) — never a touch the finger already felt. Pass `haptic` explicitly to
 *    override in either direction.
 *
 * Under reduced motion the scale drops; the opacity dim and the tint stay so users
 * still see the press.
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { HitSlop, PressDelay, Spring } from '@/constants/motion';
import { Opacity } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { hapticCommit, hapticPress, hapticSelect } from '@/lib/haptics';

/** Module-level so the non-animated path doesn't allocate a style each render. */
const DIMMED_STYLE = { opacity: Opacity.disabled } as const;

export type PressableScaleVariant = 'button' | 'card' | 'row' | 'icon' | 'link';
export type PressableScaleHaptic = 'press' | 'select' | 'commit' | false;

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  children?: PressableProps['children'];
  onPress?: PressableProps['onPress'];
  /** Static style. Callers no longer need a `({pressed}) => ...` callback —
   *  the variant owns press feedback. */
  style?: StyleProp<ViewStyle>;
  variant?: PressableScaleVariant;
  /**
   * Haptic intent fired on press. Defaults to the variant's: `'press'` for
   * `button`, silent for `card`/`row`/`icon`/`link` (they navigate — see the file
   * header). Pass `false` to silence a button, or a named intent to give a card a
   * voice when it genuinely changes state rather than navigating.
   */
  haptic?: PressableScaleHaptic;
  /** Override the variant's press delay in ms. See `PressDelay`. */
  pressDelay?: number;
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
  /**
   * Render at the disabled opacity.
   *
   * This has to be a prop rather than something the caller drops in `style`,
   * because `animatedStyle` is applied AFTER `style` and always writes a
   * concrete `opacity` — so a static `opacity: Opacity.disabled` from a caller
   * was silently overwritten with `1` on every scale variant. Both `Button` and
   * `SettingsRow` had exactly that, which is why a disabled button still looked
   * fully enabled.
   *
   * It is deliberately NOT derived from `disabled`: `ListCard` passes
   * `disabled` to mean "this card isn't interactive", and dimming those would
   * wash out ordinary content.
   */
  dimmed?: boolean;
};

const VARIANT_DEFAULTS: Record<
  PressableScaleVariant,
  {
    scale?: number;
    opacity?: number;
    hitSlop?: number;
    pressDelay: number;
    haptic: PressableScaleHaptic;
  }
> = {
  button: { scale: 0.97, opacity: 0.94, pressDelay: PressDelay.chrome, haptic: 'press' },
  // Cards/rows depress gently (0.98 — subtler than a button, since a large
  // surface moving less still reads as "alive"). The pressed bg tint, when a
  // caller passes one, layers on top via `animatedStyle`. They also carry the
  // scroll-surface press delay and stay silent: a card press is navigation.
  card: { scale: 0.98, pressDelay: PressDelay.scrollSurface, haptic: false },
  row: { scale: 0.98, pressDelay: PressDelay.scrollSurface, haptic: false },
  icon: { opacity: 0.6, hitSlop: HitSlop.icon, pressDelay: PressDelay.chrome, haptic: false },
  link: { opacity: 0.6, hitSlop: HitSlop.compact, pressDelay: PressDelay.chrome, haptic: false },
};

/**
 * Pressed opacity for the reduced-motion path, where the scale is gone. Cards and
 * rows define no opacity of their own (the scale is their feedback), so without
 * this a `card` with no `pressedBackgroundColor` — the photo preview, the toast —
 * had *no* press feedback at all once motion was reduced.
 */
const REDUCED_MOTION_SURFACE_STYLE = { opacity: 0.92 } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  variant = 'button',
  haptic,
  pressScale,
  pressDelay,
  pressedBackgroundColor,
  restingBackgroundColor = 'transparent',
  dimmed,
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
  const effectivePressDelay = pressDelay ?? defaults.pressDelay;
  // `??`, not `||` — an explicit `haptic={false}` must beat the variant default,
  // and `false` is a meaningful value here rather than "unset".
  const effectiveHaptic = haptic ?? defaults.haptic;

  // Two shared values so scale/opacity can spring while the pressed-bg snaps
  // on/off instantly (matches the iOS Mail / Linear feel — background flash is
  // binary, scale settles smoothly).
  const pressedSV = useSharedValue(0);
  const pressedBgSV = useSharedValue(0);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (effectiveHaptic === 'press') hapticPress();
      else if (effectiveHaptic === 'select') hapticSelect();
      else if (effectiveHaptic === 'commit') hapticCommit();
      onPress?.(event);
    },
    [effectiveHaptic, onPress],
  );

  // Scale variants spring; everyone else uses Pressable's synchronous `pressed`
  // flag for bg/opacity (instant in *and* out, the right feel for a tinted row or
  // a dimmed icon).
  const useAnimated = effectiveScale !== undefined && !reduced;

  // One release path, shared by onPressOut and the navigate-away safety net in
  // onPress, so the two can never disagree about how a press ends.
  //
  // A plain function, NOT a `useCallback`: listing a shared value in a dependency
  // array counts as passing it to a hook, after which `react-hooks/immutability`
  // forbids writing `.value` anywhere in the component. The compiler memoizes
  // this for us regardless.
  function release() {
    pressedSV.value = withSpring(0, Spring.press);
    pressedBgSV.value = 0;
  }

  const animatedStyle = useAnimatedStyle(() => {
    if (!useAnimated) return {};
    const p = pressedSV.value;
    const base: { transform: { scale: number }[]; opacity: number; backgroundColor?: string } = {
      transform: [{ scale: 1 - (1 - (effectiveScale ?? 1)) * p }],
      // A dimmed (disabled) surface holds the disabled opacity — this branch is
      // why `dimmed` is a prop: whatever the caller put in `style` loses to the
      // value written here.
      opacity: dimmed
        ? Opacity.disabled
        : effectiveOpacity !== undefined
          ? 1 - (1 - effectiveOpacity) * p
          : 1,
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
          //
          // Harmless that onPressOut usually fires this too: a spring retargets
          // from its current position and velocity, so the second call is a no-op
          // in flight. The old `withTiming` restarted a fresh 80ms duration from
          // mid-value instead, which is what made every tap end in a small hitch.
          release();
        }}
        onPressIn={(e) => {
          pressedSV.value = withSpring(1, Spring.press);
          pressedBgSV.value = 1;
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          release();
          onPressOut?.(e);
        }}
        hitSlop={effectiveHitSlop}
        unstable_pressDelay={effectivePressDelay}
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
      // Also here: the scroll-start flash is a touch-handling problem, not an
      // animation one, so a reduce-motion user needs the delay just as much.
      unstable_pressDelay={effectivePressDelay}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        pressed && pressedBackgroundColor ? { backgroundColor: pressedBackgroundColor } : null,
        pressed && effectiveOpacity !== undefined ? { opacity: effectiveOpacity } : null,
        // Cards/rows have no opacity of their own — the scale was their feedback,
        // and reduced motion took it away. Without this, an untinted card (photo
        // preview, toast) reads as completely dead to the touch.
        pressed && effectiveOpacity === undefined && !pressedBackgroundColor
          ? REDUCED_MOTION_SURFACE_STYLE
          : null,
        // Last, so a dimmed surface stays dim even mid-press — and so both the
        // animated and non-animated paths agree on what `dimmed` looks like.
        dimmed ? DIMMED_STYLE : null,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
