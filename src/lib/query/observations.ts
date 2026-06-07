import { queryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';
import { requireUserId } from '@/lib/query/session';
import { signedUrlFor, signedUrlMap } from '@/lib/query/storage';
import { supabase } from '@/lib/supabase';
import {
  createObservationInput,
  updateObservationInput,
  type Activity,
  type CreateObservationInput,
  type UpdateObservationInput,
} from '@/lib/validation/observation';

const FEED_WINDOW_DAYS = 14;
const FEED_LIMIT = 500;

/**
 * The joined feed row — the mobile equivalent of the web `FeedObservation`
 * (server fn `observations.ts`). Same shape so `feed.ts` bucketing and the M11
 * cards port 1:1. Signed image URLs are minted client-side here (batched),
 * since there is no server fn on mobile.
 */
export type FeedObservation = {
  id: string;
  userId: string;
  observedAt: Date;
  count: number;
  comment: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  speciesId: number;
  speciesSwedishName: string;
  speciesScientificName: string;
  /** MaFk larmlista rarity (0 = rarest → 5 = most common); null for unlisted. */
  speciesRarity: number | null;
  locationId: number | null;
  locationName: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  observerDisplayName: string | null;
  observerPhone: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  observerAvatarUrl: string | null;
  activity: Activity | null;
};

export type MemberProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

// Observations embed species + locations via their real FKs. There is NO FK
// from observations.user_id → profiles.user_id (both point at auth.users), so
// the observer profile can't be PostgREST-embedded — we batch-fetch profiles by
// user_id and merge (see `toFeedObservations`).
const OBSERVATION_SELECT =
  'id,user_id,observed_at,count,comment,latitude,longitude,image_path,activity,created_at,' +
  'species_id,species(swedish_name,scientific_name,rarity),' +
  'location_id,locations(name,latitude,longitude)';

type RawObservationRow = {
  id: string;
  user_id: string;
  observed_at: string;
  count: number;
  comment: string | null;
  latitude: number | null;
  longitude: number | null;
  image_path: string | null;
  activity: string | null;
  created_at: string;
  species_id: number;
  species: { swedish_name: string; scientific_name: string; rarity: number | null } | null;
  location_id: number | null;
  locations: { name: string; latitude: number | null; longitude: number | null } | null;
};

type RawProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  phone: string | null;
};

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Resolve observer profiles + signed image/avatar URLs for a set of raw rows,
 * then map to FeedObservation[]. One profiles query + one batched signed-URL
 * call regardless of row count.
 */
async function toFeedObservations(rows: RawObservationRow[]): Promise<FeedObservation[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('user_id,display_name,avatar_path,phone')
    .in('user_id', userIds);
  const profiles = new Map<string, RawProfileRow>(
    ((profileRows ?? []) as RawProfileRow[]).map((p) => [p.user_id, p]),
  );

  const urls = await signedUrlMap([
    ...rows.map((r) => r.image_path),
    ...[...profiles.values()].map((p) => p.avatar_path),
  ]);

  return rows.map((row) => {
    const profile = profiles.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      observedAt: new Date(row.observed_at),
      count: row.count,
      comment: row.comment,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: new Date(row.created_at),
      speciesId: row.species_id,
      speciesSwedishName: row.species?.swedish_name ?? '',
      speciesScientificName: row.species?.scientific_name ?? '',
      speciesRarity: row.species?.rarity ?? null,
      locationId: row.location_id,
      locationName: row.locations?.name ?? null,
      locationLatitude: row.locations?.latitude ?? null,
      locationLongitude: row.locations?.longitude ?? null,
      observerDisplayName: profile?.display_name ?? null,
      observerPhone: profile?.phone ?? null,
      imagePath: row.image_path,
      imageUrl: row.image_path ? (urls.get(row.image_path) ?? null) : null,
      observerAvatarUrl: profile?.avatar_path ? (urls.get(profile.avatar_path) ?? null) : null,
      activity: (row.activity as Activity | null) ?? null,
    };
  });
}

/** The whole club's feed, last 14 days (web `listFeedFn`). */
export async function listFeed(): Promise<FeedObservation[]> {
  const { data, error } = await supabase
    .from('observations')
    .select(OBSERVATION_SELECT)
    .gte('observed_at', sinceIso(FEED_WINDOW_DAYS))
    .order('observed_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  return toFeedObservations((data ?? []) as unknown as RawObservationRow[]);
}

export function feedQueryOptions() {
  return queryOptions({ queryKey: queryKeys.feed, queryFn: listFeed });
}

/** A member's profile + their observations, last 14 days (`fetchMemberFeedFn`). */
export async function fetchMemberFeed(
  userId: string,
): Promise<{ profile: MemberProfile | null; observations: FeedObservation[] }> {
  const [{ data: profileRow }, { data: obsRows, error }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name,avatar_path,phone')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('observations')
      .select(OBSERVATION_SELECT)
      .eq('user_id', userId)
      .gte('observed_at', sinceIso(FEED_WINDOW_DAYS))
      .order('observed_at', { ascending: false })
      .limit(FEED_LIMIT),
  ]);
  if (error) throw error;

  const observations = await toFeedObservations((obsRows ?? []) as unknown as RawObservationRow[]);
  const memberRow = profileRow as Pick<
    RawProfileRow,
    'display_name' | 'avatar_path' | 'phone'
  > | null;
  // Build the avatar URL on its own statement first. Keeping the `await` inside
  // the object literal of a ternary branch (`memberRow ? { …: await … } : null`)
  // mis-compiles under this SDK's Hermes async transform — the whole object
  // collapses to the number `0`, which then reads as a falsy "no profile" and
  // surfaced as a spurious "Medlemmen hittades inte." on every member screen.
  let profile: MemberProfile | null = null;
  if (memberRow) {
    const avatarUrl = await signedUrlFor(memberRow.avatar_path);
    profile = {
      displayName: memberRow.display_name,
      avatarUrl,
      phone: memberRow.phone,
    };
  }
  return { profile, observations };
}

export function memberQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.member(userId),
    queryFn: () => fetchMemberFeed(userId),
  });
}

/** A single observation with the same joined shape (`fetchObservationFn`). */
export async function fetchObservation(id: string): Promise<FeedObservation | null> {
  const { data, error } = await supabase
    .from('observations')
    .select(OBSERVATION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [observation] = await toFeedObservations([data as unknown as RawObservationRow]);
  return observation ?? null;
}

export function observationQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.observation(id),
    queryFn: () => fetchObservation(id),
  });
}

/**
 * Create an observation (direct insert). The `alertRequested` push fan-out
 * moves to a DB trigger / RPC / edge function in M4 — the client only inserts.
 * Returns the new id.
 */
export async function createObservation(input: CreateObservationInput): Promise<string> {
  const parsed = createObservationInput.parse(input);
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('observations')
    .insert({
      user_id: userId,
      species_id: parsed.speciesId,
      count: parsed.count,
      observed_at: parsed.observedAt.toISOString(),
      location_id: parsed.locationId ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      comment: parsed.comment ?? null,
      image_path: parsed.imagePath ?? null,
      activity: parsed.activity,
      alert_requested: parsed.alertRequested,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Update an observation (owner-only, enforced by RLS in M4). Old-image cleanup
 * on replace is orchestrated by the edit form in M12, which knows the prior path.
 */
export async function updateObservation(input: UpdateObservationInput): Promise<void> {
  const parsed = updateObservationInput.parse(input);
  await requireUserId();
  const { error } = await supabase
    .from('observations')
    .update({
      species_id: parsed.speciesId,
      count: parsed.count,
      observed_at: parsed.observedAt.toISOString(),
      location_id: parsed.locationId ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      comment: parsed.comment ?? null,
      image_path: parsed.imagePath ?? null,
      activity: parsed.activity,
      alert_requested: parsed.alertRequested,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.id);
  if (error) throw error;
}

/**
 * Delete an observation (owner-only, enforced by RLS in M4). Image cleanup is
 * handled by the M12 delete flow, which fetches the path first.
 */
export async function deleteObservation(id: string): Promise<void> {
  await requireUserId();
  const { error } = await supabase.from('observations').delete().eq('id', id);
  if (error) throw error;
}
