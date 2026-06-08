import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import 'expo-sqlite/localStorage/install';
import { parse as superjsonParse, stringify as superjsonStringify } from 'superjson';

// Single app-wide query client (mirrors the web app's TanStack Query setup).
// Mounted in `src/app/_layout.tsx`. Defaults tuned for a mobile feed used on
// flaky/slow networks:
//   • staleTime 2 min — fewer refetches (each one re-hits the network + re-mints
//     signed URLs); user actions still invalidate, and pull-to-refresh forces it.
//   • gcTime 24 h — keep already-loaded screens cached for the whole session, so
//     navigating back shows content instantly and a failed refetch keeps showing
//     the last-good data instead of an error.
//   • retry 2 with a capped backoff — let a transient mobile failure self-heal
//     before surfacing an error (mutations are NOT retried — see below).
//   • no window-focus refetch (a web-only concept, noise on native).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000,
      gcTime: 1000 * 60 * 60 * 24,
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

// ── Offline persistence ──────────────────────────────────────────────────────
// Persist the cache to disk (the same `expo-sqlite/localStorage` shim auth/theme
// already use) so a cold start — even with no signal — rehydrates the last-known
// feed / species / profile and renders instantly, then refetches when online.
//
// superjson (not plain JSON) so `Date` fields on FeedObservation survive the
// round-trip — `groupFeed`/`timeFriendly` need real Dates, not ISO strings.
type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
const storage = (globalThis as unknown as { localStorage: WebStorageLike }).localStorage;

/** Bump when persisted data shapes change — invalidates any old on-disk cache. */
export const PERSIST_BUSTER = 'mafk-cache-v1';
/** Discard persisted data older than this on restore (offline tolerance window). */
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

export const persister = createSyncStoragePersister({
  storage,
  key: 'mafk.queryCache',
  // Throttle disk writes so serializing the cache on rapid changes doesn't jank.
  throttleTime: 2000,
  serialize: (client) => superjsonStringify(client),
  deserialize: (cached) => superjsonParse<PersistedClient>(cached),
});
