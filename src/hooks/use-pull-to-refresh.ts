import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { hapticTick } from '@/lib/haptics';

/**
 * Plumbing for a clean pull-to-refresh: drives `RefreshControl.refreshing` from
 * the user gesture only — never from a background `isRefetching` (focus / mutation
 * invalidation toggles that prop and drag the spinner around mid-scroll). Fires a
 * single tick on commit on Android only; iOS's own UIRefreshControl already ticks
 * at the trigger threshold via the OS, so firing here would compete with it.
 * Accepts any awaitable, so callers pass `refetch()` or `Promise.all([...])`
 * directly — no `.then(() => {})` shim.
 */
export function usePullToRefresh(refetchAll: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    if (Platform.OS === 'android') hapticTick();
    setRefreshing(true);
    void refetchAll().finally(() => setRefreshing(false));
  }, [refetchAll]);

  return { refreshing, onRefresh };
}
