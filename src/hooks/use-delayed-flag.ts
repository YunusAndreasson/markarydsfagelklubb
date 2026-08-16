/**
 * Gate a loading flag so a placeholder is never a flicker.
 *
 * Two rules, both from the same observation: a skeleton that appears for 80ms and
 * a skeleton that disappears after 30ms both read as a *glitch*, not as loading.
 * The screen looks broken rather than busy.
 *
 *  1. **Delay before showing.** A query that resolves inside `delayMs` never shows
 *     a placeholder at all — the content just appears, which is the best possible
 *     loading experience. Most cache-warm and good-network reads land here.
 *  2. **Minimum visible once shown.** Having committed to a skeleton, hold it for
 *     `minVisibleMs` even if the data arrives immediately after. The extra quarter
 *     second is imperceptible as waiting and removes the blink entirely.
 *
 * Usage mirrors the raw flag, so call sites stay readable:
 *
 *   const showSkeleton = useDelayedFlag(query.isLoading);
 *   if (showSkeleton) return <FeedSkeleton />;
 *
 * Note what to pass: `isLoading` (first load only), not `isPending` — a background
 * refetch must never drop a populated screen back to bones. Screens whose query
 * has no cache to seed from are the exception and are called out at their call
 * site.
 */
import { useEffect, useRef, useState } from 'react';

import { SkeletonTiming } from '@/constants/motion';

export function useDelayedFlag(
  active: boolean,
  delayMs: number = SkeletonTiming.delay,
  minVisibleMs: number = SkeletonTiming.minVisible,
): boolean {
  const [visible, setVisible] = useState(false);
  // Mirrored in a ref so the effect can branch on the current state without
  // taking `visible` as a dependency (which would re-run it on its own write).
  const visibleRef = useRef(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (active) {
      if (visibleRef.current) return;
      const id = setTimeout(() => {
        visibleRef.current = true;
        shownAtRef.current = Date.now();
        setVisible(true);
      }, delayMs);
      return () => clearTimeout(id);
    }

    // Done loading. If the placeholder never appeared, there is nothing to undo.
    if (!visibleRef.current) return;
    // Otherwise let it serve out its minimum. Always via a timer — even at 0ms —
    // because a synchronous setState in an effect body is what
    // `react-hooks/set-state-in-effect` (React Compiler) forbids.
    const remaining = Math.max(0, shownAtRef.current + minVisibleMs - Date.now());
    const id = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(id);
  }, [active, delayMs, minVisibleMs]);

  return visible;
}
