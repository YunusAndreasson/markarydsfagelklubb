/**
 * Fetch on *intent* rather than on arrival.
 *
 * Most detail screens here never need this: `observationQueryOptions` and
 * `memberQueryOptions` seed themselves from the feed cache via `placeholderData`,
 * so tapping a card paints the destination fully populated with nothing in flight.
 * The exception is a query with no sibling cache to read from — the lokal peek's
 * larm log — which otherwise starts fetching only once its route has mounted, i.e.
 * *after* the navigation has committed and the sheet has begun presenting.
 *
 * Calling this on `onPressIn` moves that start earlier by the length of the press
 * plus the navigation commit. The destination's own `useQuery` then joins the
 * in-flight request instead of firing a second one — TanStack dedupes by key — so
 * the cost of a prefetch the user abandons is one request that the 24h `gcTime`
 * keeps anyway.
 *
 * Deliberately NOT wired to the feed: expo-router's `<Link prefetch>` works by
 * rendering the target screen off-screen, which on a render-all feed of up to 500
 * cards would mount hundreds of detail screens for no gain over the cache seeding
 * that already makes those pushes instant.
 */
import type { FetchQueryOptions, QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';

/**
 * Warm a query in the background. Fire-and-forget: a failure here is not the
 * user's problem — the destination's own `useQuery` will surface it.
 *
 * All four generics are threaded so a `queryOptions()` factory passes straight
 * through. Collapsing them (e.g. to a single `TData`) widens `TQueryKey` to
 * `readonly unknown[]`, which no longer matches the tuple keys in `query/keys.ts`.
 */
export function prefetchOnIntent<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): void {
  void queryClient.prefetchQuery(options);
}
