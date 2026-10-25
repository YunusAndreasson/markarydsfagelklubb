import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import 'expo-sqlite/localStorage/install';
import { parse as superjsonParse, stringify as superjsonStringify } from 'superjson';

import { watchQueryFocus } from '@/lib/query-focus';
import { CACHE_RETENTION_MS } from '@/lib/query-policy';

// Single app-wide query client (mirrors the web app's TanStack Query setup).
// Mounted in `src/app/_layout.tsx`. Defaults tuned for a mobile feed used on
// flaky/slow networks:
//   • staleTime 2 min — fewer refetches (each one re-hits the network + re-mints
//     signed URLs); user actions still invalidate, and pull-to-refresh forces it.
//   • gcTime 7 days — aligned with disk retention; keep already-loaded screens so
//     navigating back shows content instantly and a failed refetch keeps showing
//     the last-good data instead of an error.
//   • retry 2 with a capped backoff — let a transient mobile failure self-heal
//     before surfacing an error (mutations are NOT retried — see below).
//   • foreground refresh is opt-in for report queries; registers stay session-fresh.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000,
      gcTime: CACHE_RETENTION_MS,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
    // Writes (create/edit/delete observation, profile upsert) are not auto-retried:
    // an insert isn't idempotent, so a silent retry could duplicate a fynd. The
    // forms surface the error and let the user retry deliberately.
    mutations: { retry: 0 },
  },
});

focusManager.setEventListener(watchQueryFocus);

// ── Network awareness ────────────────────────────────────────────────────────
// React Native has no `navigator.onLine`, so by default TanStack Query treats the
// device as permanently online: an offline query fires and burns its retries (with
// backoff) into the void, and nothing refetches when the signal returns. Wiring
// `onlineManager` to expo-network fixes both — queries PAUSE while offline (no
// wasted retries / battery) and auto-refetch on reconnect (`refetchOnReconnect`
// defaults on). "Online" = internet reachable, falling back to a live connection
// when reachability is unknown, and to `true` when nothing is known yet (never
// strand the app in a false-offline state). This is the one connectivity source;
// the persisted cache still paints last-known data while paused.
onlineManager.setEventListener((setOnline) => {
  let receivedEvent = false;
  const isOnline = (s: { isInternetReachable?: boolean; isConnected?: boolean }) =>
    s.isInternetReachable ?? s.isConnected ?? true;
  // Seed the current state — the listener only fires on subsequent changes.
  void Network.getNetworkStateAsync()
    .then((s) => { if (!receivedEvent) setOnline(isOnline(s)); })
    .catch(() => { if (!receivedEvent) setOnline(true); });
  const subscription = Network.addNetworkStateListener((s) => {
    receivedEvent = true;
    setOnline(isOnline(s));
  });
  return () => subscription.remove();
});

// ── Offline persistence ──────────────────────────────────────────────────────
// Persist the cache to disk (the same `expo-sqlite/localStorage` shim auth/theme
// already use) so a cold start — even with no signal — rehydrates the last-known
// feed / species / profile and renders instantly, then refetches when online.
//
// superjson (not plain JSON) so `Date` fields on FeedObservation survive the
// round-trip — `groupFeed`/`timeFriendly` need real Dates, not ISO strings.
//
// The async persister takes this synchronous store as-is: its storage contract
// is `MaybePromise`, so plain return values are awaited like resolved promises.
type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
const storage = (globalThis as unknown as { localStorage: WebStorageLike }).localStorage;

/** Bump when persisted data shapes change — invalidates any old on-disk cache. */
export const PERSIST_BUSTER = 'mafk-cache-v2';
/** Discard persisted data older than this on restore (offline tolerance window). */
export const PERSIST_MAX_AGE = CACHE_RETENTION_MS;

export const persister = createAsyncStoragePersister({
  storage,
  key: 'mafk.queryCache',
  // Throttle disk writes so serializing the cache on rapid changes doesn't jank:
  // at most one write per 2 s. The first change after a quiet spell is written
  // at once; the rest of a burst lands as one trailing write of the final state.
  throttleTime: 2000,
  serialize: (client) => superjsonStringify(client),
  deserialize: (cached) => superjsonParse<PersistedClient>(cached),
});
