import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { showToast } from '@/components/toast';
import { hapticTick } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

/** True if a settled refetch result (or any member of a Promise.all array)
 *  is a react-query result that landed in the error state. `refetch()` never
 *  rejects — it resolves with `{ status: 'error' }` — so this is the only
 *  place a failed pull-to-refresh is visible. */
function hasError(result: unknown): boolean {
  if (Array.isArray(result)) return result.some(hasError);
  return (
    typeof result === 'object' &&
    result !== null &&
    'status' in result &&
    (result as { status: unknown }).status === 'error'
  );
}

/**
 * Plumbing for a clean pull-to-refresh: drives `RefreshControl.refreshing` from
 * the user gesture only — never from a background `isRefetching` (focus / mutation
 * invalidation toggles that prop and drag the spinner around mid-scroll). Fires a
 * single tick on commit on Android only; iOS's own UIRefreshControl already ticks
 * at the trigger threshold via the OS, so firing here would compete with it.
 * Accepts any awaitable, so callers pass `refetch()` or `Promise.all([...])`
 * directly — no `.then(() => {})` shim.
 *
 * A refresh that fails against a warm cache would otherwise be silent (the
 * screen keeps showing last-good data and never reaches its error branch), so
 * failure surfaces as an error toast here.
 */
export function usePullToRefresh(refetchAll: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    if (Platform.OS === 'android') hapticTick();
    setRefreshing(true);
    void refetchAll()
      .then((result) => {
        if (hasError(result)) showToast(sv.common.refreshFailed, 'error');
      })
      .catch(() => showToast(sv.common.refreshFailed, 'error'))
      .finally(() => setRefreshing(false));
  }, [refetchAll]);

  return { refreshing, onRefresh };
}
