import { QueryClient } from '@tanstack/react-query';

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
