/**
 * Accessibility-aware motion. Wraps Reanimated's `useReducedMotion` (which
 * reflects the OS "Reduce Motion" / "Remove animations" setting) so animated
 * components can opt out cleanly for users who ask for less motion.
 *
 * Usage:
 *   const { reduced, motion } = useMotion()
 *   <Animated.View entering={motion(FadeInDown)} layout={motion(LinearTransition)} />
 *
 * `motion(value)` returns the value normally and `undefined` when reduced motion
 * is on — and `undefined` entering/layout props are simply no-ops, so the element
 * appears instantly with no extra branching at the call site.
 */
import { useCallback } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

export function useMotion() {
  const reduced = useReducedMotion();

  const motion = useCallback(
    <T>(value: T): T | undefined => (reduced ? undefined : value),
    [reduced],
  );

  return { reduced, motion };
}
