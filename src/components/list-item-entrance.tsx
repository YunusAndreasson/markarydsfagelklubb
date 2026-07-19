/**
 * A robust staggered fade/rise-in for list rows.
 *
 * Reanimated's `entering` layout animations get CANCELLED — and then stick
 * part-faded — when a sibling re-render or layout change interrupts them mid-
 * flight. On a busy, render-all list (the feed) this hit the TOPMOST card most
 * often (it's the one actually animating when the activity / blocked / reverse-
 * geocode queries settle within the entrance window), leaving it ~50 % opaque and
 * stuck that way. An explicit final keyframe doesn't help: a *cancelled* animation
 * freezes at its current value, not its target.
 *
 * So drive opacity from a mounted shared value via `withTiming` instead (the same
 * pattern `PulsingDot` uses). A `withTiming` isn't cancelled by re-renders — only
 * by a new animation on the same value — so it always runs to opacity 1 no matter
 * how often the tree re-renders around it. `exiting` is forwarded for delete/reflow.
 */
import { type ComponentProps, type ReactNode, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Curve, Duration, Stagger, type StaggerSpeed } from '@/constants/motion';
import { useMotion } from '@/hooks/use-motion';

export function ListItemEntrance({
  index,
  speed = 'default',
  exiting,
  children,
}: {
  /** Global stagger position — the row's cascade delay is `index * Stagger[speed]`, capped. */
  index: number;
  speed?: StaggerSpeed;
  exiting?: ComponentProps<typeof Animated.View>['exiting'];
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    const delay = Math.min(index * Stagger[speed], 240);
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: Duration.quick, easing: Curve.out }),
    );
  }, [reduced, index, speed, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  return (
    <Animated.View style={style} exiting={exiting}>
      {children}
    </Animated.View>
  );
}
