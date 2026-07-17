import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';
import { requireUserId } from '@/lib/query/session';
import { supabase } from '@/lib/supabase';
import { createLocationInput, type CreateLocationInput } from '@/lib/validation/location';

export type Location = {
  id: number;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
};

type RawLocationRow = {
  id: number;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** All saved locations, ordered by name (`listLocationsFn`). */
export async function listLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id,name,description,latitude,longitude')
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawLocationRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

export function locationsQueryOptions() {
  return queryOptions({ queryKey: queryKeys.locations, queryFn: listLocations });
}

/** A lokal offered as a quick pick — coordinates guaranteed (the pick must be
 *  able to place the map marker). */
export type CommonLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

/** Quick-list cap — the picker shows the most-used lokaler, not the full register. */
const MAX_COMMON = 15;

/**
 * The lokaler offered as quick picks above the location-picker map: only places
 * where birds have actually been reported (≥ 1 observation) AND that have
 * coordinates, most-used first. Usage is counted over the latest 1000
 * observations so the list tracks where the club actually reports; ties fall
 * back to A–Ö. The list therefore grows by itself as lokaler come into use.
 */
export async function listCommonLocations(): Promise<CommonLocation[]> {
  const [locRes, useRes] = await Promise.all([
    supabase
      .from('locations')
      .select('id,name,latitude,longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null),
    supabase
      .from('observations')
      .select('location_id')
      .not('location_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);
  if (locRes.error) throw locRes.error;
  if (useRes.error) throw useRes.error;

  const uses = new Map<number, number>();
  for (const row of (useRes.data ?? []) as { location_id: number | null }[]) {
    if (row.location_id != null) uses.set(row.location_id, (uses.get(row.location_id) ?? 0) + 1);
  }

  return ((locRes.data ?? []) as RawLocationRow[])
    .filter((l): l is RawLocationRow & { latitude: number; longitude: number } =>
      l.latitude != null && l.longitude != null && (uses.get(l.id) ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'sv'),
    )
    .slice(0, MAX_COMMON)
    .map((l) => ({ id: l.id, name: l.name, latitude: l.latitude, longitude: l.longitude }));
}

export function commonLocationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.locationsCommon,
    queryFn: listCommonLocations,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a location. Admin-only is enforced by RLS (M4) — the web checked
 * `profiles.is_admin` in a server fn; on mobile the insert policy is the guard,
 * so a non-admin insert is rejected by PostgREST. Returns the new id.
 */
export async function createLocation(input: CreateLocationInput): Promise<number> {
  const parsed = createLocationInput.parse(input);
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: parsed.name,
      description: parsed.description ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      created_by_user_id: userId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
