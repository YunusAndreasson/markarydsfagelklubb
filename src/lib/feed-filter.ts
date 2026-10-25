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

/** Rarities present in `list`, rarest-first (0 → 5, the most notable on top). */
function rarityOptions(list: FeedObservation[]): Map<RarityLevel, RarityOption> {
  const out = new Map<RarityLevel, RarityOption>()
  for (const o of list) {
    const level = rarityLevel(o)
    const hit = out.get(level)
    if (hit) hit.count += 1
    else out.set(level, { level, count: 1 })
  }
  return out
}

/** Activities present in `list`. Raw values — the sheet sorts by Swedish label. */
function activityOptions(list: FeedObservation[]): Map<Activity, ActivityOption> {
  const out = new Map<Activity, ActivityOption>()
  for (const o of list) {
    if (o.activity == null) continue
    const hit = out.get(o.activity)
    if (hit) hit.count += 1
    else out.set(o.activity, { value: o.activity, count: 1 })
  }
  return out
}

/** Named lokaler present in `list`. */
function locationOptions(list: FeedObservation[]): Map<number, LocationOption> {
  const out = new Map<number, LocationOption>()
  for (const o of list) {
    if (o.locationId == null) continue
    const hit = out.get(o.locationId)
    if (hit) hit.count += 1
    else out.set(o.locationId, { id: o.locationId, name: o.locationName ?? '', count: 1 })
  }
  return out
}

/**
 * The options to offer for each dimension, with the number of observations each
 * would actually yield.
 *
 * These are FACET counts, not raw totals: every dimension is counted against the
 * filter with its own dimension cleared but the others still applied. That is
 * what makes the number on a chip a promise — tapping "Födosökande · 4" leaves 4
 * observations on screen.
 *
 * Counting the whole feed instead (what this did before) produced numbers that
 * were true of the data and false of the button: with rarity 3 selected, the
 * activity chips still advertised "Födosökande · 27" from the unfiltered set, and
 * tapping it landed on "Visa 0 träffar" and an empty list. The sheet was
 * confidently quoting a figure no combination of its own controls could produce.
 *
 * A value the filter currently selects is always offered, even at count 0 —
 * otherwise the chip holding an over-narrow constraint would disappear from the
 * only screen that can release it, and the 0 is precisely the explanation for
 * the empty feed behind the sheet.
 *
 * Called with no `filter` (the feed screen, which only needs the lokal names) it
 * behaves exactly as before: plain totals over everything passed in.
 */
export function deriveFilterOptions(
  observations: FeedObservation[],
  filter: FeedFilter = EMPTY_FILTER,
  currentUserId?: string | null,
): FilterOptions {
  // Scope (`onlyMine`) stays applied throughout — it's the frame the rest of the
  // sheet is read inside, not one of the facets.
  const rarities = rarityOptions(
    applyFeedFilter(observations, { ...filter, rarities: [] }, currentUserId),
  )
  const activities = activityOptions(
    applyFeedFilter(observations, { ...filter, activities: [] }, currentUserId),
  )
  const locations = locationOptions(
    applyFeedFilter(observations, { ...filter, locationIds: [] }, currentUserId),
  )

  // Keep the full set of choices in place as constraints change. A zero count
  // explains an unavailable combination without removing its control or making
  // whole sections disappear (especially when switching to an empty "Mina").
  for (const [level, option] of rarityOptions(observations)) {
    if (!rarities.has(level)) rarities.set(level, { ...option, count: 0 })
  }
  for (const [value, option] of activityOptions(observations)) {
    if (!activities.has(value)) activities.set(value, { ...option, count: 0 })
  }
  for (const [id, option] of locationOptions(observations)) {
    if (!locations.has(id)) locations.set(id, { ...option, count: 0 })
  }

  // Keep selected values reachable even if the underlying report disappeared.
  for (const level of filter.rarities) {
    if (!rarities.has(level)) rarities.set(level, { level, count: 0 })
  }
  for (const value of filter.activities) {
    if (!activities.has(value)) activities.set(value, { value, count: 0 })
  }
  for (const id of filter.locationIds) {
    if (locations.has(id)) continue
    const name = observations.find((o) => o.locationId === id)?.locationName ?? ''
    locations.set(id, { id, name, count: 0 })
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
