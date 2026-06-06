import { QueryClient } from '@tanstack/react-query';

// Single app-wide query client (mirrors the web app's TanStack Query setup).
// Mounted in `src/app/_layout.tsx`. Defaults tuned for a mobile feed: a short
// stale window so screens feel fresh, one retry for flaky mobile networks, and
// no window-focus refetch (a web-only concept that is noise on native).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
