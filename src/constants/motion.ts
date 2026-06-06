/**
 * Motion vocabulary — durations, springs, easings, hit slop. The one place to
 * tune the app's "feel". Names map to intent (what the motion is *for*), not the
 * raw value, so call sites read as design and changes here move every surface in
 * lockstep.
 *
 * Notion/Linear-style rhythm: instant press-in (the finger times itself), short
 * crisp release, ~160ms for most enter/exit, ~220ms for system surfaces, springs
 * for tactile moments. Anything outside this table should earn a comment.
 */
import { Easing } from 'react-native-reanimated';

/** Timing durations in ms. Names map to intent, not magnitude. */
export const Duration = {
  /** Press-release snap, scale settle-back. Snappy enough to feel like physics. */
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

/** Spring configs — two shapes, picked by feel. Add a third only when needed. */
export const Spring = {
  /** Default — natural settle for entrances and gestures. */
  responsive: { damping: 18, stiffness: 160, mass: 1 },
  /** Snappier — segmented controls, toggles, sliding indicators. */
  snappy: { damping: 22, stiffness: 240, mass: 1 },
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

/** HitSlop policy. Apply to every tap target where visual size < tap size. */
export const HitSlop = {
  /** Icon-only buttons — close, chevrons, mic toggle. */
  icon: 12,
  /** Compact text controls — toast Undo, inline links. */
  compact: 8,
  /** Dense rows — adjacent siblings would overlap with more slop. */
  dense: 4,
} as const;
