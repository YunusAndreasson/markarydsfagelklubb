import { QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { queryKeys } from './keys';
import { observationQueryOptions, type FeedObservation } from './observations';

vi.mock('@/lib/query-client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { staleTime: 120_000, retry: false } },
    }),
  };
});
vi.mock('@/lib/query/session', () => ({ requireUserId: vi.fn() }));
vi.mock('@/lib/query/storage', () => ({
  avatarCacheKey: vi.fn(), signedUrlFor: vi.fn(), signedUrlMap: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    })),
  },
}));

const row = { id: 'cached-report' } as FeedObservation;
let unsubscribe: (() => void) | undefined;

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  queryClient.clear();
});

function openDetail(id = row.id) {
  const observer = new QueryObserver(queryClient, observationQueryOptions(id));
  unsubscribe = observer.subscribe(() => {});
  return observer.getCurrentResult();
}

describe('detail cache freshness', () => {
  it('opens a fresh feed row without another network request', () => {
    const updatedAt = Date.now() - 30_000;
    queryClient.setQueryData(queryKeys.feed, [row], { updatedAt });
    const result = openDetail();
    expect(result.data).toBe(row);
    expect(result.dataUpdatedAt).toBe(updatedAt);
    expect(result.isFetching).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('shows an old persisted row immediately and refetches it', () => {
    const updatedAt = Date.now() - 24 * 60 * 60 * 1000;
    queryClient.setQueryData(queryKeys.feed, [row], { updatedAt });
    const result = openDetail();
    expect(result.data).toBe(row);
    expect(result.dataUpdatedAt).toBe(updatedAt);
    expect(result.isFetching).toBe(true);
    expect(supabase.from).toHaveBeenCalledOnce();
  });

  it('refetches when the source feed has been invalidated', () => {
    queryClient.setQueryData(queryKeys.feed, [row]);
    void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    expect(openDetail().isFetching).toBe(true);
    expect(supabase.from).toHaveBeenCalledOnce();
  });

  it('fetches a deep-linked report absent from the feed', () => {
    queryClient.setQueryData(queryKeys.feed, [row]);
    expect(openDetail('another-report').isFetching).toBe(true);
    expect(supabase.from).toHaveBeenCalledOnce();
  });
});
