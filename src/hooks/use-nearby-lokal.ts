/**
 * Names a pin-drop observation by the club's own lokal register when the pin is
 * close enough to one — the same 300 m rule the Lokaler map counts activity by and
 * the report picker offers as a GPS snap (`src/lib/lokal-proximity.ts`).
 *
 * Why: only a small minority of observations pick a named lokal; the rest are pin
 * drops, which the feed labelled with a reverse-geocoded street address ("4623,
 * Exhult") or the generic "På karta". Both are worse than the name the club
 * actually uses for that spot — a birder reading "Reningsdammarna" knows exactly
 * where to go, where "4623, Exhult" means nothing. And since the map ALREADY
 * counts that pin toward the lokal, naming it here just makes the feed agree with
 * the map instead of quietly disagreeing.
 *
 * Nearest-wins: a pin between two lokaler takes the closer one, never both.
 * Pass `null` coordinates for observations that already carry a named lokal, so
 * this never runs for them.
 */
import { useQuery } from '@tanstack/react-query';

import { LOKAL_RADIUS_M, nearestLocationWithin } from '@/lib/lokal-proximity';
import { locationsQueryOptions } from '@/lib/query/locations';

export function useNearbyLokalName(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  const enabled = latitude != null && longitude != null;
  // Shared cache key with the Lokaler tab and the picker — every card on screen
  // reads one fetch, not one each.
  const { data } = useQuery({ ...locationsQueryOptions(), enabled });
  if (!enabled || !data) return null;

  const positioned = data.filter(
    (l): l is typeof l & { latitude: number; longitude: number } =>
      l.latitude != null && l.longitude != null,
  );
  return nearestLocationWithin(latitude, longitude, positioned, LOKAL_RADIUS_M)?.name ?? null;
}
