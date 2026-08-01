/**
 * Geolocation helpers — the native (`expo-location`) port of the web app's
 * `src/lib/geo.ts`. The return shapes are kept **identical** to the web so the
 * location picker (M9) and observation form (M12) compose against the same
 * contract on both platforms.
 *
 * The web's browser-Permissions-API observable has no native equivalent, so
 * `watchGeoPermission` re-checks when the app returns to the foreground (the only
 * moment a user could have flipped the OS permission from Settings).
 */
import * as Location from 'expo-location';

import { watchOnForeground } from '@/lib/app-state';

export type GeoPosition = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy radius in metres. */
  accuracy: number;
};

export type GeoResult =
  | { ok: true; position: GeoPosition }
  | { ok: false; denied: boolean; error: string };

export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

// Swedish error copy, inlined like the web `geo.ts` (these never surface as the
// primary UX — callers branch on `denied` and show their own guidance).
const ERR_DENIED = 'Du nekade tillgång till platsdata.';
const ERR_GENERIC = 'Kunde inte hämta din position.';

/**
 * Request permission (prompting if it can still be asked) and return one fix.
 * `denied` is true when the OS reports the permission as denied — the caller
 * then points the user at Settings rather than retrying.
 */
export async function getCurrentPosition(timeoutMs = 15000): Promise<GeoResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, denied: perm.status === Location.PermissionStatus.DENIED, error: ERR_DENIED };
    }
    // Fast path: a recent cached fix selects the pin (near-)instantly. A cold
    // high-accuracy GPS fix takes several seconds on iOS — too slow when the user
    // just wants a starting point they can then drag to refine. Accept a fix up to
    // 2 min old and ≤200 m accurate; `getLastKnownPositionAsync` returns null if
    // none qualifies, so we only use it when it's genuinely good enough.
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 200 });
    if (cached) return { ok: true, position: toPosition(cached) };

    // No usable cached fix → take a live one. `Balanced` (~100 m, wifi/cell-assisted)
    // resolves far quicker than `High` and is plenty for "roughly where I am"; the
    // draggable pin covers the rest.
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return { ok: true, position: toPosition(pos) };
  } catch {
    return { ok: false, denied: false, error: ERR_GENERIC };
  }
}

function toPosition(pos: Location.LocationObject): GeoPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 0,
  };
}

/**
 * Great-circle distance between two lat/lng points, in metres (haversine). Used
 * to snap a GPS fix to a nearby named lokal in the location picker. Earth radius
 * 6371 km; the small-distance error of a spherical model is negligible at the
 * scale we care about (tens–hundreds of metres).
 */
export { distanceMeters } from '@/lib/lokal-proximity';

/**
 * Current foreground-location permission as a 4-state value (web parity).
 * `denied` means blocked — the OS won't prompt again; `prompt` means we can still
 * ask (undetermined, or denied-but-can-ask-again).
 */
export async function getGeoPermission(): Promise<GeoPermission> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === Location.PermissionStatus.GRANTED) return 'granted';
    if (perm.status === Location.PermissionStatus.DENIED) return perm.canAskAgain ? 'prompt' : 'denied';
    return 'prompt'; // UNDETERMINED
  } catch {
    return 'unknown';
  }
}

/**
 * Subscribe to permission changes. Emits the current state immediately, then
 * re-checks each time the app returns to the foreground (the user may have
 * changed it in Settings while away). Returns an unsubscribe function.
 */
export function watchGeoPermission(onChange: (state: GeoPermission) => void): () => void {
  return watchOnForeground(getGeoPermission, onChange);
}
