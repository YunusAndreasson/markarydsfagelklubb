/**
 * Optimistic-update plumbing shared by the observation create / update / delete
 * mutations. Each was hand-rolling the same `onMutate` preamble and `onError`
 * rollback, including one subtlety that is easy to get wrong in a re-implementation:
 *
 * **`undefined` is not a value to restore.** If a key held no cached data before
 * the optimistic write, `setQueryData(key, undefined)` does NOT return the cache to
 * its prior state — it leaves the entry present (and, for the feed, seeds an empty
 * array on the next read). The entry has to be *removed* instead. `rollback` below
 * is the one place that distinction lives.
 *
 * Usage in a mutation:
 *
 *     onMutate: async (value) => {
 *       const snapshots = await beginOptimistic([queryKeys.feed]);
 *       queryClient.setQueryData(queryKeys.feed, …);
 *       return snapshots;
 *     },
 *     onError: (_err, _value, snapshots) => {
 *       rollback(snapshots);
 *       …
 *     },
 */
import { type QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';

/** A key's cached value from just before an optimistic write. */
export type QuerySnapshot = { queryKey: QueryKey; previous: unknown };

/**
 * Cancel any in-flight fetches for these keys (so a refetch landing mid-write
 * can't overwrite the optimistic row) and snapshot their current values for
 * rollback. Await this before applying the optimistic update.
 */
export async function beginOptimistic(keys: QueryKey[]): Promise<QuerySnapshot[]> {
  await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
  return keys.map((queryKey) => ({ queryKey, previous: queryClient.getQueryData(queryKey) }));
}

/**
 * Restore every snapshotted key. A key that held nothing before is removed rather
 * than written back as `undefined` (see the file header).
 */
export function rollback(snapshots: QuerySnapshot[] | undefined): void {
  if (!snapshots) return;
  for (const { queryKey, previous } of snapshots) {
    if (previous === undefined) queryClient.removeQueries({ queryKey, exact: true });
    else queryClient.setQueryData(queryKey, previous);
  }
}
