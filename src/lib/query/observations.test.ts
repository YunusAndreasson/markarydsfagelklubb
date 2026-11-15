import { QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { queryKeys } from './keys';
import { feedQueryOptions, memberQueryOptions, observationQueryOptions, type FeedObservation } from './observations';

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

function report(id: string): FeedObservation {
  return {
    id, userId: 'member', observedAt: new Date('2026-11-14T12:00:00Z'),
    createdAt: new Date('2026-11-14T12:01:00Z'), count: 1, comment: null,
    latitude: 56, longitude: 13, speciesId: 1, speciesSwedishName: 'Tjäder',
    speciesScientificName: 'Tetrao urogallus', speciesRarity: 4,
    locationId: null, locationName: null, locationLatitude: null, locationLongitude: null,
    observerDisplayName: 'Observatör', observerPhone: null, imagePath: 'member/photo.jpg',
    imageUrl: 'https://example.test/photo?token=first',
    observerAvatarUrl: 'https://example.test/avatar?token=first',
    observerAvatarCacheKey: 'member/avatar.jpg#1', activity: 'stationär',
  };
}

describe('report refresh structural sharing', () => {
  beforeEach(() => {
    queryClient.setQueryDefaults(queryKeys.feed, { structuralSharing: feedQueryOptions().structuralSharing });
  });

  it('keeps an unchanged feed and its dates when a fetch parses fresh Date objects', () => {
    const previous = [report('a'), report('b')];
    queryClient.setQueryData(queryKeys.feed, previous);
    queryClient.setQueryData(queryKeys.feed, [report('a'), report('b')]);
    expect(queryClient.getQueryData(queryKeys.feed)).toBe(previous);
  });

  it.each<Partial<FeedObservation>>([
    { count: 2 },
    { comment: 'Ny kommentar' },
    { observedAt: new Date('2026-11-14T13:00:00Z') },
    { createdAt: new Date('2026-11-14T12:02:00Z') },
    { imageUrl: 'https://example.test/photo?token=refreshed' },
    { observerAvatarUrl: 'https://example.test/avatar?token=refreshed' },
    { observerDisplayName: 'Nytt namn', observerAvatarCacheKey: 'member/avatar.jpg#2' },
    { latitude: 57, locationName: 'Ny lokal' },
  ])('preserves changed report values and shares only unchanged rows (%j)', (change) => {
    const previous = [report('a'), report('b')];
    const changed = { ...report('a'), ...change };
    queryClient.setQueryData(queryKeys.feed, previous);
    queryClient.setQueryData(queryKeys.feed, [changed, report('b')]);
    const result = queryClient.getQueryData<FeedObservation[]>(queryKeys.feed)!;
    expect(result).toEqual([changed, report('b')]);
    expect(result[0]).not.toBe(previous[0]);
    expect(result[1]).toBe(previous[1]);
  });

  it('shares surviving rows across inserts, reorder and removal without keeping stale reports', () => {
    const a = report('a');
    const b = report('b');
    queryClient.setQueryData(queryKeys.feed, [a, b]);
    queryClient.setQueryData(queryKeys.feed, [report('new'), report('b'), report('a')]);
    const inserted = queryClient.getQueryData<FeedObservation[]>(queryKeys.feed)!;
    expect(inserted.map((observation) => observation.id)).toEqual(['new', 'b', 'a']);
    expect(inserted[1]).toBe(b);
    expect(inserted[2]).toBe(a);
    queryClient.setQueryData(queryKeys.feed, [report('b')]);
    expect(queryClient.getQueryData<FeedObservation[]>(queryKeys.feed)).toEqual([b]);
    expect(queryClient.getQueryData<FeedObservation[]>(queryKeys.feed)?.[0]).toBe(b);
    queryClient.setQueryData(queryKeys.feed, []);
    expect(queryClient.getQueryData(queryKeys.feed)).toEqual([]);
  });

  it('updates member metadata while retaining unchanged observation rows', () => {
    const options = memberQueryOptions('member');
    queryClient.setQueryDefaults(options.queryKey, { structuralSharing: options.structuralSharing });
    const previous = {
      profile: { displayName: 'Observatör', phone: null, avatarUrl: null, avatarCacheKey: null },
      observations: [report('a')],
    };
    queryClient.setQueryData(options.queryKey, previous);
    queryClient.setQueryData(options.queryKey, { ...previous, observations: [report('a')] });
    expect(queryClient.getQueryData(options.queryKey)).toBe(previous);
    const changed = { ...previous.profile, phone: '0700000000', avatarUrl: 'https://example.test/new' };
    queryClient.setQueryData(options.queryKey, { profile: changed, observations: [report('a')] });
    const result = queryClient.getQueryData(options.queryKey)!;
    expect(result.profile).toEqual(changed);
    expect(result.observations).toBe(previous.observations);
    queryClient.setQueryData(options.queryKey, { profile: null, observations: [] });
    expect(queryClient.getQueryData(options.queryKey)).toEqual({ profile: null, observations: [] });
  });

  it('keeps unchanged detail identity, applies edits, and respects a deleted report', () => {
    const options = observationQueryOptions('a');
    queryClient.setQueryDefaults(options.queryKey, { structuralSharing: options.structuralSharing });
    const previous = report('a');
    queryClient.setQueryData(options.queryKey, previous);
    queryClient.setQueryData(options.queryKey, report('a'));
    expect(queryClient.getQueryData(options.queryKey)).toBe(previous);
    const changed = { ...report('a'), count: 9 };
    queryClient.setQueryData(options.queryKey, changed);
    const edited = queryClient.getQueryData(options.queryKey)!;
    expect(edited.count).toBe(9);
    expect(edited.observedAt).toBe(previous.observedAt);
    expect(edited.createdAt).toBe(previous.createdAt);
    queryClient.setQueryData(options.queryKey, null);
    expect(queryClient.getQueryData(options.queryKey)).toBeNull();
    queryClient.setQueryData(options.queryKey, report('a'));
    expect(queryClient.getQueryData(options.queryKey)).toEqual(previous);
  });
});
