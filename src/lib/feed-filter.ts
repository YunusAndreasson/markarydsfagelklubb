import type { FeedObservation } from '@/lib/query/observations'
import type { RarityLevel } from '@/lib/rarity'
import type { Activity } from '@/lib/validation/observation'

/**
 * The displayed rarity level of an observation. Mirrors `@/lib/rarity`'s
 * `rarityFor` — unlisted species (no larmlista prefix) fall back to 5, the
 * most-common bucket, matching the badge they show. Inlined (not imported) so
 * this module stays free of runtime app imports and trivially unit-testable;
 * `rarity.ts` pulls in `constants/theme` → `react-native`, which the test runner
 * can't load.
 */
function rarityLevel(o: FeedObservation): RarityLevel {
  return (o.speciesRarity ?? 5) as RarityLevel
}

/**
 * Client-side filter for the Obsar feed. The feed is already fully loaded
 * (≤500 obs, 14 days) and bucketed client-side by `groupFeed`, so filtering is
 * client-side too — instant, no extra queries. Pure + i18n-free so it's trivially
 * unit-testable; the sheet maps activity values → Swedish labels.
 *
 * Semantics: OR within a dimension, AND across dimensions. An empty array (or
 * `onlyMine: false`) means "no constraint" for that dimension.
 *
 * Rarity (the larmlista "prefix", 0 = rarest → 5 = most common) replaces the old
 * per-species filter: birders narrow by how notable a fynd is ("only show me the
 * rarities"), not by hunting one species in a 14-day list. Matched via
 * `rarityFor`, so unlisted species fall in with level 5 (their displayed badge).
 */
export type FeedFilter = {
  onlyMine: boolean
  rarities: RarityLevel[]
  activities: Activity[]
  locationIds: number[]
}

export const EMPTY_FILTER: FeedFilter = {
  onlyMine: false,
  rarities: [],
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
    if (f.rarities.length > 0 && !f.rarities.includes(rarityLevel(o))) return false
    if (f.activities.length > 0 && (o.activity == null || !f.activities.includes(o.activity)))
      return false
    if (f.locationIds.length > 0 && (o.locationId == null || !f.locationIds.includes(o.locationId)))
      return false
    return true
  })
}

export type RarityOption = { level: RarityLevel; count: number }
export type ActivityOption = { value: Activity; count: number }
export type LocationOption = { id: number; name: string; count: number }

export type FilterOptions = {
  rarities: RarityOption[]
  activities: ActivityOption[]
  locations: LocationOption[]
}

/**
 * The distinct values actually present in the feed, each with how many
 * observations carry it — so every offered option yields ≥1 result and birders
 * see how common each is. Rarities sort rarest-first (0 → 5, the most notable
 * levels on top); locations by name (sv locale); activities keep their raw value
 * (the sheet sorts them by Swedish label).
 */
export function deriveFilterOptions(observations: FeedObservation[]): FilterOptions {
  const rarities = new Map<RarityLevel, RarityOption>()
  const activities = new Map<Activity, ActivityOption>()
  const locations = new Map<number, LocationOption>()

  for (const o of observations) {
    const level = rarityLevel(o)
    const r = rarities.get(level)
    if (r) r.count += 1
    else rarities.set(level, { level, count: 1 })

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
    rarities: [...rarities.values()].sort((a, b) => a.level - b.level),
    activities: [...activities.values()],
    locations: [...locations.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv')),
  }
}

/** Number of active constraints — drives the header button badge ("Filter · 2"). */
export function activeFilterCount(f: FeedFilter): number {
  return (
    f.rarities.length +
    f.activities.length +
    f.locationIds.length +
    (f.onlyMine ? 1 : 0)
  )
}
