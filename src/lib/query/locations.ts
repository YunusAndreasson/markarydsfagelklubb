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
