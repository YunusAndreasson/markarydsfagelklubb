import { queryOptions } from '@tanstack/react-query';

import { LOKAL_RADIUS_M, nearestLocationWithin } from '@/lib/lokal-proximity';
import { queryKeys } from '@/lib/query/keys';
import { queryClient } from '@/lib/query-client';
import { reportQueryPolicy } from '@/lib/query-policy';
import { locationsQueryOptions, type LocatedLocation } from '@/lib/query/locations';
import { supabase } from '@/lib/supabase';

/** Half-width of the server-side prefilter box. Comfortably wider than
 *  {@link LOKAL_RADIUS_M} so the precise circular test client-side is what decides. */
const BBOX_M = 500;

/**
 * A larm (bird alert) as stored in the durable `alerts` log. The row is
 * denormalized — species/location/observer names + coordinates are snapshotted
 * at send time — so a larm stays readable even after its observation is deleted.
 * Written server-side by the `send-bird-alert` edge function; read-only here.
 */
export type Alert = {
  id: string;
  observationId: string | null;
  locationId: number | null;
  locationName: string | null;
  speciesId: number | null;
  speciesName: string | null;
  observerName: string | null;
  /** Snapshotted at send time — lets a pin-drop larm be matched to a nearby lokal. */
  latitude: number | null;
  longitude: number | null;
  count: number | null;
  observedAt: Date | null;
  sentAt: Date;
  recipientCount: number | null;
};

type RawAlertRow = {
  id: string;
  observation_id: string | null;
  location_id: number | null;
  location_name: string | null;
  species_id: number | null;
  species_name: string | null;
  observer_name: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number | null;
  observed_at: string | null;
  sent_at: string;
  recipient_count: number | null;
};

const ALERT_SELECT =
  'id,observation_id,location_id,location_name,species_id,species_name,observer_name,latitude,longitude,count,observed_at,sent_at,recipient_count';

function toAlert(row: RawAlertRow): Alert {
  return {
    id: row.id,
    observationId: row.observation_id,
    locationId: row.location_id,
    locationName: row.location_name,
    speciesId: row.species_id,
    speciesName: row.species_name,
    observerName: row.observer_name,
    latitude: row.latitude,
    longitude: row.longitude,
    count: row.count,
    observedAt: row.observed_at ? new Date(row.observed_at) : null,
    sentAt: new Date(row.sent_at),
    recipientCount: row.recipient_count,
  };
}

/**
 * Every larm sent from a lokal, newest first.
 *
 * "From this lokal" means the SAME thing the Lokaler map means by it: an exact
 * `location_id` match **or** a pin drop whose nearest lokal within
 * {@link LOKAL_RADIUS_M} is this one. Matching on `location_id` alone was wrong —
 * only 12 of 178 larm carry one, because the club overwhelmingly drops pins rather
 * than picking a named lokal. Reningsdammarna listed 1 larm instead of 13, and six
 * lokaler claimed "Inga larm härifrån ännu" while having up to 5. Worse, the sheet
 * contradicted itself: the line above the list ("N observationer senaste 14
 * dagarna") already counted by proximity, so the header and the list disagreed
 * about the same lokal.
 *
 * The coordinates were there the whole time — `alerts.latitude/longitude` are
 * snapshotted at send time, the select just never asked for them.
 */
export async function listLocationAlerts(locationId: number): Promise<Alert[]> {
  const register = await queryClient.query(locationsQueryOptions());
  const locations = register.filter(
    (l): l is LocatedLocation => l.latitude != null && l.longitude != null,
  );
  const target = locations.find((l) => l.id === locationId);

  // Narrow server-side to the exact matches plus a bounding box around the lokal,
  // so this doesn't drag the whole (unbounded, ever-growing) larm log over the
  // wire. The box is deliberately generous — the real circular test runs below.
  let query = supabase.from('alerts').select(ALERT_SELECT);
  if (target) {
    const dLat = BBOX_M / 111_320;
    const dLng = BBOX_M / (111_320 * Math.max(0.1, Math.cos((target.latitude * Math.PI) / 180)));
    query = query.or(
      `location_id.eq.${locationId},` +
        `and(latitude.gte.${target.latitude - dLat},latitude.lte.${target.latitude + dLat},` +
        `longitude.gte.${target.longitude - dLng},longitude.lte.${target.longitude + dLng})`,
    );
  } else {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query.order('sent_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as RawAlertRow[]).map(toAlert).filter((a) => {
    if (a.locationId != null) return a.locationId === locationId;
    if (a.latitude == null || a.longitude == null) return false;
    // Nearest-wins, exactly like listLocationActivity — a pin between two lokaler
    // belongs to the closer one, never to both.
    const near = nearestLocationWithin(a.latitude, a.longitude, locations, LOKAL_RADIUS_M);
    return near?.id === locationId;
  });
}

export function locationAlertsQueryOptions(locationId: number) {
  return queryOptions({
    ...reportQueryPolicy,
    queryKey: queryKeys.alertsForLocation(locationId),
    queryFn: () => listLocationAlerts(locationId),
  });
}
