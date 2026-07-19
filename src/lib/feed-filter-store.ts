/**
 * Shared feed-filter state — a tiny external store so the Larm feed and the
 * native filter sheet (a separate `formSheet` route) read and write the SAME
 * filter. That's what keeps the filter LIVE: toggling a chip in the sheet updates
 * this store, and the feed — rendered behind the half-height sheet — re-renders
 * against it instantly, with no "Apply" step. A plain module store (not context)
 * because the two screens sit in different navigation subtrees.
 */
import { useSyncExternalStore } from 'react';

import { EMPTY_FILTER, type FeedFilter } from '@/lib/feed-filter';

let state: FeedFilter = EMPTY_FILTER;
const listeners = new Set<() => void>();

function getSnapshot(): FeedFilter {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Replace the active feed filter and notify subscribers (feed + sheet). */
export function setFeedFilter(next: FeedFilter): void {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

/** Subscribe a component to the active feed filter. */
export function useFeedFilter(): FeedFilter {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
