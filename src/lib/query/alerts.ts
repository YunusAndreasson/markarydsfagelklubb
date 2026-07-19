import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';
import { supabase } from '@/lib/supabase';

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
  count: number | null;
  observed_at: string | null;
  sent_at: string;
  recipient_count: number | null;
};

const ALERT_SELECT =
  'id,observation_id,location_id,location_name,species_id,species_name,observer_name,count,observed_at,sent_at,recipient_count';

function toAlert(row: RawAlertRow): Alert {
  return {
    id: row.id,
    observationId: row.observation_id,
    locationId: row.location_id,
    locationName: row.location_name,
    speciesId: row.species_id,
    speciesName: row.species_name,
    observerName: row.observer_name,
    count: row.count,
    observedAt: row.observed_at ? new Date(row.observed_at) : null,
    sentAt: new Date(row.sent_at),
    recipientCount: row.recipient_count,
  };
}

/** Every larm sent from a lokal, newest first (`listLocationAlertsFn`). */
export async function listLocationAlerts(locationId: number): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select(ALERT_SELECT)
    .eq('location_id', locationId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RawAlertRow[]).map(toAlert);
}

export function locationAlertsQueryOptions(locationId: number) {
  return queryOptions({
    queryKey: queryKeys.alertsForLocation(locationId),
    queryFn: () => listLocationAlerts(locationId),
  });
}
