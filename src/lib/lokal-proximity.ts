/**
 * "Is this point at that lokal?" — the club's one proximity rule, and the
 * haversine it is built on.
 *
 * Deliberately dependency-free (no expo, no Supabase) so it is unit-testable and
 * so both consumers can share it without dragging a network client along:
 *   • the report picker offers a named lokal when your GPS fix is close enough,
 *   • the Lokaler map counts an observation toward a lokal by the same measure.
 * Those two must agree, or the map contradicts the picker that filed the report.
 */

/** Great-circle distance between two WGS84 points, in metres (haversine). */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * How close a point has to be to count as "at this lokal", in metres.
 *
 * 300 m is measured, not guessed. Against the club's own 104 pin-drop
 * observations (2026-08-01), nearest-lokal distance clusters like this:
 *
 *   ≤150 m  17 obs      ← the radius this replaced
 *   ≤250 m  24 obs
 *   ≤300 m  25 obs
 *   ≤400 m  25 obs      ← nothing at all lands between 300 and 400 m
 *   ~800 m  +31 obs     ← a residential cluster 786–871 m from Hualtet
 *
 * So 300 m sits in an empty gap: it picks up everything that plausibly means
 * "standing at the site" and still leaves a 2.6× margin before the houses near
 * Hualtet, which six different members report from and which must never be
 * labelled as that lokal. Widening past ~500 m starts swallowing them.
 *
 * Several lokaler are closer to each other than this (Ängabäck and Ängabäcks
 * kraftstation share a point; Tröskeln/Rallvägen are 52–173 m apart), so a fix
 * can be "at" more than one. {@link nearestLocationWithin} resolves to the
 * closest, and the picker only ever *offers* it — the reporter confirms.
 */
export const LOKAL_RADIUS_M = 300;

/** The minimum a lokal must carry to be a proximity candidate. */
type Positioned = { latitude: number | null; longitude: number | null };

/**
 * The lokal closest to a point, if one lies within `radiusMeters`. Lokaler
 * without coordinates are never candidates; ties resolve to the nearer one.
 * Returns null when nothing is close enough, so the caller keeps the raw point.
 */
export function nearestLocationWithin<T extends Positioned>(
  latitude: number,
  longitude: number,
  locations: readonly T[],
  radiusMeters: number,
): (T & { latitude: number; longitude: number }) | null {
  let best: (T & { latitude: number; longitude: number }) | null = null;
  let bestDistance = radiusMeters;
  for (const loc of locations) {
    if (loc.latitude == null || loc.longitude == null) continue;
    const d = distanceMeters(latitude, longitude, loc.latitude, loc.longitude);
    if (d <= bestDistance) {
      bestDistance = d;
      best = loc as T & { latitude: number; longitude: number };
    }
  }
  return best;
}
