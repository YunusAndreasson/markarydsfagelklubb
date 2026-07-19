/**
 * A tiny promise bridge so a native-sheet picker ROUTE can hand its selection
 * back to the field that opened it — the same shape as `lib/confirm.ts`. Native
 * sheets (`presentation: 'formSheet'`) are presented by navigation, so a picker
 * can't be a controlled child that calls `onChange` directly; instead the field
 * awaits `requestPick()` (which opens the route) and the route resolves it.
 *
 * The route resolves with the chosen value (via `usePickerResult` → `router.back()`),
 * or the bridge resolves `null` when the sheet is dismissed without a choice
 * (swipe-down / tap-outside → the route unmounts → `cancelPick`).
 *
 * Exactly one picker is open at a time (a field opens exactly one), so a single
 * global slot suffices; a stale request is resolved `null` before a new one opens.
 */
import { useCallback, useEffect, useRef } from 'react';

import { router } from 'expo-router';

let pending: { resolve: (value: unknown) => void } | null = null;

/** Open a picker route and await its selection (`null` if dismissed). */
export function requestPick<T>(open: () => void): Promise<T | null> {
  pending?.resolve(null);
  return new Promise<T | null>((resolve) => {
    pending = { resolve: resolve as (value: unknown) => void };
    open();
  });
}

/** Resolve the open request with a chosen value. */
export function resolvePick(value: unknown): void {
  pending?.resolve(value);
  pending = null;
}

/** Resolve the open request as cancelled (no choice). */
export function cancelPick(): void {
  pending?.resolve(null);
  pending = null;
}

/**
 * Route-side helper: returns a `choose(value)` that resolves the awaiting field
 * and dismisses the sheet. If the sheet is dismissed WITHOUT choosing (swipe /
 * tap-outside), the route's unmount cancels the request so the field's await
 * settles to `null`.
 */
export function usePickerResult<T>(): (value: T) => void {
  const chosen = useRef(false);
  useEffect(
    () => () => {
      if (!chosen.current) cancelPick();
    },
    [],
  );
  return useCallback((value: T) => {
    chosen.current = true;
    resolvePick(value);
    router.back();
  }, []);
}
