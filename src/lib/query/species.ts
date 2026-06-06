import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';
import { supabase } from '@/lib/supabase';

export type Species = {
  id: number;
  swedishName: string;
  scientificName: string;
  family: string | null;
  sortOrder: number;
};

type RawSpeciesRow = {
  id: number;
  swedish_name: string;
  scientific_name: string;
  family: string | null;
  sort_order: number;
};

/** All species, ordered like the web (`listSpeciesFn`): sort_order, then name. */
export async function listSpecies(): Promise<Species[]> {
  const { data, error } = await supabase
    .from('species')
    .select('id,swedish_name,scientific_name,family,sort_order')
    .order('sort_order', { ascending: true })
    .order('swedish_name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawSpeciesRow[]).map((row) => ({
    id: row.id,
    swedishName: row.swedish_name,
    scientificName: row.scientific_name,
    family: row.family,
    sortOrder: row.sort_order,
  }));
}

export function speciesQueryOptions() {
  return queryOptions({ queryKey: queryKeys.species, queryFn: listSpecies });
}
