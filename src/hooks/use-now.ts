/**
 * One shared clock for every relative timestamp on screen ("5m sedan").
 *
 * Those labels are computed during render from `new Date()`, which is only ever
 * right if something re-renders — and in this app nothing does. The feed's query
 * data is stable between refetches, the React Compiler memoizes the cards, and
 * the native tabs keep every tab mounted, so a feed left open simply froze:
 * measured on device, a card read "46m sedan" when the observation was 71 minutes
 * old. For a bird alert — where the whole question is "is it still there?" — a
 * timestamp that lies by 25 minutes is worse than no timestamp.
 *
 * So the clock becomes a subscribable value instead of a render-time read. One
 * module-level ticker serves every card (mirroring `lib/feed-filter-store.ts` and
 * the toast store), and `useSyncExternalStore` gives a tear-free read under
 * concurrent rendering.
 *
 * The interval only runs while something is actually subscribed, and every
 * foreground transition re-reads the wall clock: timers are throttled or frozen
 * while backgrounded, so returning to the app after an hour must correct the ages
 * immediately rather than at the next tick.
 */
import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

/** A minute — the finest granularity `sv.feed.timeAgo` renders. */
const TICK_MS = 60 * 1000;

let current = new Date();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let appState: NativeEventSubscription | null = null;

function emit(): void {
  current = new Date();
  listeners.forEach((l) => l());
}

function start(): void {
  if (timer) return;
  // The stored value is as old as the last unmount; refresh before the first
  // read. No notify needed — `useSyncExternalStore` re-reads right after
  // subscribing and re-renders if the snapshot moved.
  current = new Date();
  timer = setInterval(emit, TICK_MS);
  appState = AppState.addEventListener('change', (next) => {
    if (next === 'active') emit();
  });
}

function stop(): void {
  if (timer) clearInterval(timer);
  timer = null;
  appState?.remove();
  appState = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): Date {
  return current;
}

/**
 * The current time, refreshed every minute (and on every foreground). Use it
 * wherever a rendered value is derived from "now" — never `new Date()` inline.
 */
export function useNow(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
