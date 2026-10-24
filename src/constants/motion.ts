/**
 * Motion vocabulary — durations, springs, easings, hit slop. The one place to
 * tune the app's "feel". Names map to intent (what the motion is *for*), not the
 * raw value, so call sites read as design and changes here move every surface in
 * lockstep.
 *
 * Notion/Linear-style rhythm: presses ride one interruptible spring, ~160ms for
 * most enter/exit, ~220ms for system surfaces, springs for tactile moments.
 * Anything outside this table should earn a comment.
 */
import { Easing } from 'react-native-reanimated';

/** Timing durations in ms. Names map to intent, not magnitude. */
export const Duration = {
  /** The shortest deliberate beat — a value flip that still wants a transition. */
  instant: 80,
  /** Default enter/exit + layout reflow. The everyday "Linear" tempo. */
  quick: 160,
  /** System surfaces — modals, toasts, sheet entrances, swipe-commit fling. */
  standard: 220,
  /** A named, choreographed reveal, not a magic number. */
  flip: 380,
  /** Skeleton loop dwell — single in/out half-cycle. */
  pulse: 850,
} as const;

/**
 * The fade a photo or avatar (`expo-image`) arrives with. It plays only when the
 * bytes come off the network — the wait it exists to soften. An image already in
 * the memory or disk cache appears at once (`skipOnCacheHit`): the same photo
 * moving from feed card to detail screen to fullscreen viewer, or a card
 * remounting on a filter change, otherwise re-faded on every mount.
 */
export const ImageFade = { duration: Duration.quick, skipOnCacheHit: 'all' } as const;

/** Spring configs — three shapes, picked by feel. Add a fourth only when needed. */
export const Spring = {
  /** Default — natural settle for entrances and gestures. */
  responsive: { damping: 18, stiffness: 160, mass: 1 },
  /** Snappier — segmented controls, toggles, sliding indicators. */
  snappy: { damping: 22, stiffness: 240, mass: 1 },
  /**
   * Press depress + release. Near-critically damped (ζ ≈ 0.84): reaches the
   * depressed state in ~120ms, settles in ~220ms, overshoot under 1 % — a surface
   * with mass, not a bounce.
   *
   * A spring rather than a timing on purpose. A press is interrupted constantly
   * (finger lifts mid-depress, a navigating press fires its release twice), and a
   * `withTiming` restarted mid-flight begins a fresh full duration from wherever
   * it had got to — which is what made presses read as twitchy. A spring
   * retargets from its current position *and velocity*, so every interruption is
   * continuous.
   */
  press: { damping: 26, stiffness: 340, mass: 0.7 },
} as const;

/** Easings for timing animations that aren't springs. */
export const Curve = {
  /** Skeleton breathing, anything that loops. */
  inOut: Easing.inOut(Easing.ease),
  /** Default enter/exit when timing is the right tool. */
  out: Easing.out(Easing.quad),
} as const;

/**
 * List-entrance choreography. `default` reads as a Linear-style cascade without
 * the last row dragging on for a beat. `tight` for dense rows where staggering
 * would feel laggy; `loose` for hero cards or sections that earn the breathing
 * room. The `listEntrance` helper in `lib/motion.ts` caps total delay so a
 * 50-item list doesn't take 2s to settle.
 */
export const Stagger = {
  tight: 30,
  default: 50,
  loose: 80,
} as const;

export type StaggerSpeed = keyof typeof Stagger;

/**
 * Skeleton timing — see `useDelayedFlag`, which owns the behaviour.
 *
 * `delay` is the grace period before the app admits it is loading: anything that
 * resolves faster shows no placeholder at all, which is the best loading state
 * there is. `minVisible` is how long a placeholder stays once shown, so data
 * arriving a beat later doesn't make it blink out. Both sit well inside the
 * ~1s "keeps the user's flow of thought" budget, so neither reads as waiting.
 */
export const SkeletonTiming = {
  delay: 150,
  minVisible: 250,
} as const;

/**
 * Delay before a press registers *visually*, per kind of surface.
 *
 * UIKit scroll views set `delaysContentTouches` for exactly this reason: without
 * it, the finger you put down to start a scroll depresses and tints whatever card
 * it landed on, then cancels a frame later. React Native's `Pressable` has no such
 * default, which is why the feed flickered under the thumb. 65ms clears a
 * scroll-start without making a deliberate tap feel late — a tap that completes
 * inside the window still shows feedback, because RN then fires press-in and
 * press-out back to back.
 *
 * Chrome (buttons, icons, links) is never in that fight — it doesn't sit inside a
 * scrolling surface — so it stays immediate.
 */
export const PressDelay = {
  /** Cards and rows — anything that lives inside a scroll view. */
  scrollSurface: 65,
  /** Buttons, icon buttons, inline links. */
  chrome: 0,
} as const;

/** HitSlop policy. Apply to every tap target where visual size < tap size. */
export const HitSlop = {
  /** Icon-only buttons — close, chevrons, mic toggle. */
  icon: 12,
  /** Compact text controls — toast Undo, inline links. */
  compact: 8,
  /** Dense rows — adjacent siblings would overlap with more slop. */
  dense: 4,
} as const;
