import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '@/lib/query-client';
import { listLocationAlerts } from './alerts';
import { queryKeys } from './keys';
import { invalidateLocationSummaries, listCommonLocations, listLocationActivity, locationsQueryOptions } from './locations';

const backend = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: backend }));
vi.mock('@/lib/query-client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) };
});
vi.mock('@/lib/query/session', () => ({ requireUserId: vi.fn() }));
vi.mock('@/lib/query/observations', () => ({ sinceIso: () => '2026-10-01T00:00:00Z' }));

const locations = [
  { id: 1, name: 'Åmot', description: null, latitude: 56, longitude: 13 },
  { id: 2, name: 'Boalt', description: null, latitude: 57, longitude: 14 },
  { id: 3, name: 'Utan koordinater', description: null, latitude: null, longitude: null },
];

beforeEach(() => {
  queryClient.clear();
  backend.from.mockReset();
  backend.from.mockImplementation((table: string) => {
    if (table === 'locations') return { select: async () => ({ data: locations, error: null }) };
    if (table === 'alerts') {
      const alertQuery = {
        select: () => alertQuery,
        or: () => alertQuery,
        eq: () => alertQuery,
        order: async () => ({ data: [], error: null }),
      };
      return alertQuery;
    }
    if (table !== 'observations') throw new Error(`Unexpected backend table: ${table}`);
    const observationQuery = {
      select: () => observationQuery,
      not: () => observationQuery,
      order: () => observationQuery,
      limit: async () => ({ data: [{ location_id: 2 }, { location_id: 2 }, { location_id: 1 }], error: null }),
      gte: async () => ({ data: [
        { location_id: 1, latitude: null, longitude: null },
        { location_id: null, latitude: 56.0001, longitude: 13.0001 },
      ], error: null }),
    };
    return observationQuery;
  });
});
afterEach(() => queryClient.clear());

describe('shared location register', () => {
  it('shares one catalog fetch across register, activity and common-location requests', async () => {
    const [register, activity, common, alerts] = await Promise.all([
      queryClient.query(locationsQueryOptions()), listLocationActivity(), listCommonLocations(),
      listLocationAlerts(1),
    ]);
    expect(register.map(l => l.name)).toEqual(['Boalt', 'Utan koordinater', 'Åmot']);
    expect(activity).toEqual({ 1: 2 });
    expect(common.map(l => l.id)).toEqual([2, 1]);
    expect(alerts).toEqual([]);
    expect(backend.from.mock.calls.filter(([table]) => table === 'locations')).toHaveLength(1);
    await listLocationActivity();
    expect(backend.from.mock.calls.filter(([table]) => table === 'locations')).toHaveLength(1);
  });

  it('invalidates derived lists after a write without invalidating the catalog', async () => {
    queryClient.setQueryData(queryKeys.locations, locations);
    queryClient.setQueryData(queryKeys.locationsActivity, { 1: 2 });
    queryClient.setQueryData(queryKeys.locationsCommon, []);
    await invalidateLocationSummaries();
    expect(queryClient.getQueryState(queryKeys.locations)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(queryKeys.locationsActivity)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.locationsCommon)?.isInvalidated).toBe(true);
    expect(backend.from).not.toHaveBeenCalled();
  });
});
