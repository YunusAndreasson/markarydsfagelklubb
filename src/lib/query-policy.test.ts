import { dehydrate, focusManager, hydrate, QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CACHE_RETENTION_MS, catalogQueryPolicy, prepareQueriesForColdStart, reportQueryPolicy } from './query-policy';

const clients: QueryClient[] = [];
const cleanups: (() => void)[] = [];
function client() {
  const result = new QueryClient({
    defaultOptions: { queries: { staleTime: 120_000, gcTime: CACHE_RETENTION_MS, retry: false, refetchOnWindowFocus: false } },
  });
  clients.push(result);
  return result;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  for (const c of clients.splice(0)) { c.unmount(); c.clear(); }
  focusManager.setFocused(undefined);
});

describe('refresh policy', () => {
  it('restores content immediately and marks backend queries stale without fetching before auth', async () => {
    const previous = client();
    const keys = [['species'], ['locations'], ['feed'], ['profile', 'user'], ['reverseGeocode', 56, 13]];
    for (const key of keys) previous.setQueryData(key, ['cached']);
    const next = client();
    hydrate(next, dehydrate(previous));
    await prepareQueriesForColdStart(next);
    for (const key of keys) expect(next.getQueryData(key)).toEqual(['cached']);
    expect(next.getQueryState(['species'])?.isInvalidated).toBe(true);
    expect(next.getQueryState(['locations'])?.isInvalidated).toBe(true);
    expect(next.getQueryState(['feed'])?.isInvalidated).toBe(true);
    expect(next.getQueryState(['profile', 'user'])?.isInvalidated).toBe(true);
    expect(next.getQueryState(['reverseGeocode', 56, 13])?.isInvalidated).toBe(false);
    expect(next.isFetching()).toBe(0);
  });

  it('refreshes a restored register once, sharing that fetch across startup and picker consumers', async () => {
    const c = client();
    c.setQueryData(['species'], ['old']);
    await prepareQueriesForColdStart(c);
    const fetch = vi.fn(async () => ['new']);
    const options = { ...catalogQueryPolicy, queryKey: ['species'], queryFn: fetch };
    const startup = new QueryObserver(c, options);
    cleanups.push(startup.subscribe(() => {}));
    const picker = new QueryObserver(c, options);
    cleanups.push(picker.subscribe(() => {}));
    await vi.waitFor(() => expect(startup.getCurrentResult().data).toEqual(['new']));
    const laterPicker = new QueryObserver(c, options);
    cleanups.push(laterPicker.subscribe(() => {}));
    expect(fetch).toHaveBeenCalledOnce();
    expect(laterPicker.getCurrentResult().isFetching).toBe(false);
  });

  it('refreshes fresh reports on foreground return, leaving reference lists alone', async () => {
    const c = client();
    c.mount();
    focusManager.setFocused(true);
    const reportFetch = vi.fn(async () => ['report']);
    const catalogFetch = vi.fn(async () => ['species']);
    const report = new QueryObserver(c, { ...reportQueryPolicy, queryKey: ['feed'], queryFn: reportFetch });
    const catalog = new QueryObserver(c, { ...catalogQueryPolicy, queryKey: ['species'], queryFn: catalogFetch });
    cleanups.push(report.subscribe(() => {}), catalog.subscribe(() => {}));
    await vi.waitFor(() => expect(c.isFetching()).toBe(0));
    expect(reportFetch).toHaveBeenCalledOnce();
    expect(catalogFetch).toHaveBeenCalledOnce();
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await vi.waitFor(() => expect(reportFetch).toHaveBeenCalledTimes(2));
    focusManager.setFocused(true);
    expect(catalogFetch).toHaveBeenCalledOnce();
    expect(reportFetch).toHaveBeenCalledTimes(2);
  });
});
