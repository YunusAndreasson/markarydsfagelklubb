/**
 * Resolves a coordinate pair to a short, human-readable place name via the OS
 * geocoder (`expo-location`) — used by the feed card + observation detail to show
 * a real location name for pin-drop observations that have no named location,
 * instead of a generic "På karta".
 *
 * Cached forever per (rounded) coordinate through React Query: coordinates don't
 * change, so a place only geocodes once and is shared across every card showing
 * it. Disabled (no request) when coordinates are missing — pass `null` for the
 * lat/lng of observations that already carry a named location so they never hit
 * the geocoder. Reverse geocoding needs no location permission and no API key
 * (it uses CLGeocoder on iOS / Android's Geocoder); if it's unavailable the query
 * fails quietly and the caller falls back to its own placeholder.
 */
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

/** A concise label from a geocoded address: "<street or POI>, <locality>". */
function formatAddress(a: Location.LocationGeocodedAddress): string | null {
  const primary = a.street ?? a.name ?? null;
  const locality = a.city ?? a.subregion ?? a.district ?? a.region ?? null;
  const parts = [primary, locality].filter((p): p is string => !!p);
  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique.join(', ') : null;
}

export function useReverseGeocode(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  const enabled = latitude != null && longitude != null;
  // Round the cache key to ~11m so near-identical pins share a result; geocode
  // with the full-precision coordinate.
  const keyLat = enabled ? Math.round(latitude! * 1e4) / 1e4 : null;
  const keyLng = enabled ? Math.round(longitude! * 1e4) / 1e4 : null;

  const query = useQuery({
    queryKey: ['reverseGeocode', keyLat, keyLng],
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const results = await Location.reverseGeocodeAsync({
        latitude: latitude!,
        longitude: longitude!,
      });
      for (const result of results) {
        const label = formatAddress(result);
        if (label) return label;
      }
      return null;
    },
  });

  return query.data ?? null;
}
