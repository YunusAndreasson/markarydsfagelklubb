/**
 * Reading a query's status honestly when the device is offline.
 *
 * `onlineManager` is wired to expo-network (see `query-client.ts`), so a query
 * started without a connection does not fail — it **pauses**. That is the right
 * behaviour (no wasted retries, automatic refetch on reconnect) but it makes the
 * usual status flags lie: `fetchStatus` goes to `'paused'`, which means
 * `isFetching` is false, which means `isLoading` (`isPending && isFetching`) is
 * false too. A screen branching on `isLoading` therefore falls straight through
 * its skeleton into its *empty* state — telling a member with no signal that the
 * club has reported nothing, or that an observation "hittades inte".
 *
 * A skeleton is no better an answer: it would spin forever with nothing on the
 * way. The truthful state is "you're offline and we have nothing cached", which
 * is what `OfflineBlock` says.
 */
type QueryLike = { isPending: boolean; fetchStatus: 'fetching' | 'paused' | 'idle' };

/** True when a query has no data and cannot get any until the network returns. */
export function isOfflinePending(query: QueryLike): boolean {
  return query.isPending && query.fetchStatus === 'paused';
}
