import type { FeedObservation } from '@/lib/query/observations'
import type { Activity } from '@/lib/validation/observation'

/**
 * Client-side filter for the Obsar feed. The feed is already fully loaded
 * (≤500 obs, 14 days) and bucketed client-side by `groupFeed`, so filtering is
 * client-side too — instant, no extra queries. Pure + i18n-free so it's trivially
 * unit-testable; the sheet maps activity values → Swedish labels.
 *
 * Semantics: OR within a dimension, AND across dimensions. An empty array (or
 * `onlyMine: false`) means "no constraint" for that dimension.
 */
export type FeedFilter = {
  onlyMine: boolean
  speciesIds: number[]
  activities: Activity[]
  locationIds: number[]
}

export const EMPTY_FILTER: FeedFilter = {
  onlyMine: false,
  speciesIds: [],
  activities: [],
  locationIds: [],
}

/** Apply the filter. Observations with no activity/named location are excluded
 *  when (and only when) that dimension is constrained. */
export function applyFeedFilter(
  observations: FeedObservation[],
  f: FeedFilter,
  currentUserId?: string | null,
): FeedObservation[] {
  return observations.filter((o) => {
    if (f.onlyMine && o.userId !== currentUserId) return false
    if (f.speciesIds.length > 0 && !f.speciesIds.includes(o.speciesId)) return false
    if (f.activities.length > 0 && (o.activity == null || !f.activities.includes(o.activity)))
      return false
    if (f.locationIds.length > 0 && (o.locationId == null || !f.locationIds.includes(o.locationId)))
      return false
    return true
  })
}

export type SpeciesOption = { id: number; swedishName: string; count: number }
export type ActivityOption = { value: Activity; count: number }
export type LocationOption = { id: number; name: string; count: number }

export type FilterOptions = {
  species: SpeciesOption[]
  activities: ActivityOption[]
  locations: LocationOption[]
}

/**
 * The distinct values actually present in the feed, each with how many
 * observations carry it — so every offered option yields ≥1 result and birders
 * see how common each is. Species + locations are sorted by name (sv locale);
 * activities keep their raw value (the sheet sorts them by Swedish label).
 */
export function deriveFilterOptions(observations: FeedObservation[]): FilterOptions {
  const species = new Map<number, SpeciesOption>()
  const activities = new Map<Activity, ActivityOption>()
  const locations = new Map<number, LocationOption>()

  for (const o of observations) {
    const sp = species.get(o.speciesId)
    if (sp) sp.count += 1
    else species.set(o.speciesId, { id: o.speciesId, swedishName: o.speciesSwedishName, count: 1 })

    if (o.activity != null) {
      const ac = activities.get(o.activity)
      if (ac) ac.count += 1
      else activities.set(o.activity, { value: o.activity, count: 1 })
    }

    if (o.locationId != null) {
      const loc = locations.get(o.locationId)
      if (loc) loc.count += 1
      else locations.set(o.locationId, { id: o.locationId, name: o.locationName ?? '', count: 1 })
    }
  }

  return {
    species: [...species.values()].sort((a, b) => a.swedishName.localeCompare(b.swedishName, 'sv')),
    activities: [...activities.values()],
    locations: [...locations.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv')),
  }
}

/** Number of active constraints — drives the header button badge ("Filter · 2"). */
export function activeFilterCount(f: FeedFilter): number {
  return (
    f.speciesIds.length +
    f.activities.length +
    f.locationIds.length +
    (f.onlyMine ? 1 : 0)
  )
}
