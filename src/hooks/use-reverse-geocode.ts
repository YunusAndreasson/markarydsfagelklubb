/**
 * Resolves a coordinate pair to a short, human-readable place name via the OS
 * geocoder (`expo-location`) — used by the feed card + observation detail to show
 * a real location name for pin-drop observations that have no named location,
 * instead of a generic "På karta".
 *
 * Two caches sit in front of the geocoder:
 *  - In-memory (React Query, forever) — a place geocodes once per session and is
 *    shared across every card showing it.
 *  - On-disk (`localStorage`, the expo-sqlite shim) — successful lookups persist
 *    by (rounded) coordinate, so a cold start reads known places instantly and
 *    the geocoder is hit only for coordinates never seen before. Coordinates
 *    never change, so a cached name never goes stale.
 *
 * Disabled (no request) when coordinates are missing — pass `null` for the lat/lng
 * of observations that already carry a named location so they never hit the
 * geocoder. Reverse geocoding needs no location permission and no API key (it uses
 * CLGeocoder on iOS / Android's Geocoder); if it's unavailable the query fails
 * quietly and the caller falls back to its own placeholder.
 *
 * Crucially, requests are SERIALIZED (see `queuedReverseGeocode`): the OS geocoder
 * throttles bursts hard, and the feed mounts dozens of pin-drop cards at once. Run
 * unqueued, all but the first couple get throttled and fall back to "På karta".
 */
import 'expo-sqlite/localStorage/install';

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

// On-disk cache, backed by the same expo-sqlite `localStorage` shim the theme +
// push-prefs use. Only *successful* names are persisted — a null may be a
// transient throttle, so it stays uncached and is retried next session rather
// than freezing "På karta" onto a place that does have a name.
type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};
const storage = (globalThis as unknown as { localStorage?: WebStorageLike }).localStorage;
const CACHE_PREFIX = 'mafk.geocode.';

function readCache(key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // best-effort
  }
}

// The OS geocoder (CLGeocoder on iOS / Android's Geocoder) throttles bursts hard.
// The feed mounts dozens of pin-drop cards at once, each firing its own request,
// so without coordination most get throttled and fall back to "På karta". Funnel
// every lookup through one FIFO queue — a single request in flight at a time, with
// a short gap between — so the geocoder answers them all instead of dropping the
// burst. The on-disk cache means this drain is paid once ever (per coordinate),
// not once per cold start.
const GEOCODE_GAP_MS = 500;
let geocodeChain: Promise<unknown> = Promise.resolve();

function queuedReverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const run = geocodeChain.then(async () => {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    for (const result of results) {
      const label = formatAddress(result);
      if (label) return label;
    }
    return null;
  });
  // Keep the chain alive and spaced regardless of this call's outcome, so one
  // throttle/failure neither stalls nor collapses the queue for the rest. A
  // rejected `run` still propagates to its caller (→ React Query retry).
  geocodeChain = run
    .catch(() => null)
    .then(() => new Promise((resolve) => setTimeout(resolve, GEOCODE_GAP_MS)));
  return run;
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
    // Throttled requests reject; retry with React Query's backoff re-enqueues
    // them at the tail of the serial queue, where they resolve once it drains.
    retry: 2,
    queryFn: async () => {
      const cacheKey = `${CACHE_PREFIX}${keyLat},${keyLng}`;
      const cached = readCache(cacheKey);
      if (cached !== null) return cached;
      const label = await queuedReverseGeocode(latitude!, longitude!);
      if (label !== null) writeCache(cacheKey, label);
      return label;
    },
  });

  return query.data ?? null;
}
