/**
 * Motion prop bundles for repeated patterns. Reanimated's entering/layout props
 * compose nicely with `useMotion()`'s reduced-motion gating — collect the bundles
 * here so list reflows stay consistent across screens (and one number changes
 * them all).
 */
import { FadeInDown, Keyframe } from 'react-native-reanimated';

import { Duration, Stagger, type StaggerSpeed } from '@/constants/motion';

type MotionGate = <T>(value: T) => T | undefined;

/**
 * Entering animation for the n-th item in a stagger-in list. Wrap the row in
 * an `Animated.View entering={motion(listEntrance(i))}` to get a Notion/Linear
 * cascade-in. Total delay is capped at 240ms so a 50-row list still feels
 * responsive instead of stretching for a beat.
 */
export function listEntrance(index: number, speed: StaggerSpeed = 'default') {
  const delay = Math.min(index * Stagger[speed], 240);
  return FadeInDown.duration(Duration.quick).delay(delay);
}

/**
 * For rows that go away by user intent (swipe-to-delete, undo-confirmed delete)
 * — fades out and shrinks slightly so the disappearance reads as the row
 * receding, not popping. The mirrored entering keyframe gives newly-added rows
 * (optimistic-add) a matching fade/scale-in so the list reads as a single, alive
 * surface.
 *
 * NOTE: intentionally no `layout` (LinearTransition) here. Our feed + member
 * lists are a plain, *sectioned* ScrollView (not a virtualized list — the feed
 * is render-all by design). Reanimated's `LinearTransition` mis-settles siblings
 * in that setup: after an optimistic add or a delete/block removal, surviving
 * cards ended up mispositioned — overlapping (hiding the observer footer) on
 * removal, or leaving an oversized gap on insert — and the wrong layout PERSISTED
 * until an app restart (a pull-to-refresh didn't clear it). Dropping the layout
 * transition lets React Native re-lay-out siblings synchronously (they snap to the
 * correct spot); the fade/scale in-out still keeps the list feeling alive.
 */
export function deletableListItemMotion(motion: MotionGate) {
  const exiting = new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: 0.96 }] },
  }).duration(Duration.quick);
  const entering = new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.96 }] },
    100: { opacity: 1, transform: [{ scale: 1 }] },
  }).duration(Duration.quick);
  return {
    entering: motion(entering),
    exiting: motion(exiting),
  } as const;
}
