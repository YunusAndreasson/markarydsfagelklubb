import type { QueryClient } from '@tanstack/react-query';

/** Keep inactive queries for as long as their persisted cache is usable. */
export const CACHE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Reference registers stay fresh for this process; cold-start restore invalidates them. */
export const catalogQueryPolicy = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
} as const;

/** A foreground return must refresh reports even inside the two-minute stale window. */
export const reportQueryPolicy = { refetchOnWindowFocus: 'always' } as const;

const BACKEND_QUERY_ROOTS = new Set([
  'species', 'locations', 'feed', 'observation', 'member', 'alerts', 'profile',
]);

/** Runs after disk hydration, before observers resume. Keeps cached content and
 * marks backend data stale without starting requests before auth is ready.
 * Cached reverse-geocoded street names are independent of backend updates. */
export function prepareQueriesForColdStart(client: QueryClient): Promise<void> {
  return client.invalidateQueries({
    predicate: ({ queryKey }) => BACKEND_QUERY_ROOTS.has(String(queryKey[0])),
    refetchType: 'none',
  });
}
