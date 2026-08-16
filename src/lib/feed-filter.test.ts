import { describe, expect, it } from 'vitest'
import type { FeedObservation } from '@/lib/query/observations'
import type { RarityLevel } from '@/lib/rarity'
import type { Activity } from '@/lib/validation/observation'
import { activeFilterCount, applyFeedFilter, deriveFilterOptions, EMPTY_FILTER } from './feed-filter'

let seq = 0
function obs(partial: Partial<FeedObservation> = {}): FeedObservation {
  seq += 1
  return {
    id: `00000000-0000-0000-0000-${String(seq).padStart(12, '0')}`,
    userId: 'u1',
    observedAt: new Date('2026-05-29T08:00:00+02:00'),
    count: 1,
    comment: null,
    latitude: null,
    longitude: null,
    createdAt: new Date('2026-05-29T08:00:00+02:00'),
    speciesId: 1,
    speciesSwedishName: 'Talgoxe',
    speciesScientificName: 'Parus major',
    speciesRarity: 5,
    locationId: null,
    locationName: null,
    locationLatitude: null,
    locationLongitude: null,
    observerDisplayName: 'Test',
    observerPhone: null,
    imagePath: null,
    imageUrl: null,
    observerAvatarUrl: null,
    observerAvatarPath: null,
    activity: null,
    ...partial,
  }
}

describe('applyFeedFilter', () => {
  it('returns everything for the empty filter', () => {
    const data = [obs(), obs({ speciesId: 2 })]
    expect(applyFeedFilter(data, EMPTY_FILTER)).toHaveLength(2)
  })

  it('filters by rarity (OR within the dimension)', () => {
    const data = [obs({ speciesRarity: 0 }), obs({ speciesRarity: 1 }), obs({ speciesRarity: 5 })]
    const r = applyFeedFilter(data, { ...EMPTY_FILTER, rarities: [0, 5] })
    expect(r.map((o) => o.speciesRarity).sort()).toEqual([0, 5])
  })

  it('treats unlisted species (null rarity) as level 5', () => {
    const data = [obs({ speciesRarity: null }), obs({ speciesRarity: 0 })]
    const r = applyFeedFilter(data, { ...EMPTY_FILTER, rarities: [5] })
    expect(r).toHaveLength(1)
    expect(r[0]?.speciesRarity).toBeNull()
  })

  it('filters by activity and excludes null-activity obs when constrained', () => {
    const data = [
      obs({ activity: 'rastande' }),
      obs({ activity: 'häckande' }),
      obs({ activity: null }),
    ]
    const r = applyFeedFilter(data, { ...EMPTY_FILTER, activities: ['rastande'] })
    expect(r).toHaveLength(1)
    expect(r[0]?.activity).toBe('rastande')
  })

  it('filters by location and excludes free-pin (null location) obs when constrained', () => {
    const data = [obs({ locationId: 5 }), obs({ locationId: 6 }), obs({ locationId: null })]
    const r = applyFeedFilter(data, { ...EMPTY_FILTER, locationIds: [5] })
    expect(r).toHaveLength(1)
    expect(r[0]?.locationId).toBe(5)
  })

  it('filters to only the current user with onlyMine', () => {
    const data = [obs({ userId: 'me' }), obs({ userId: 'other' })]
    const r = applyFeedFilter(data, { ...EMPTY_FILTER, onlyMine: true }, 'me')
    expect(r).toHaveLength(1)
    expect(r[0]?.userId).toBe('me')
  })

  it('onlyMine with no current user matches nothing', () => {
    const data = [obs({ userId: 'me' }), obs({ userId: 'other' })]
    expect(applyFeedFilter(data, { ...EMPTY_FILTER, onlyMine: true })).toHaveLength(0)
  })

  it('ANDs across dimensions', () => {
    const data = [
      obs({ speciesRarity: 0, activity: 'rastande', userId: 'me' }),
      obs({ speciesRarity: 0, activity: 'häckande', userId: 'me' }),
      obs({ speciesRarity: 1, activity: 'rastande', userId: 'me' }),
      obs({ speciesRarity: 0, activity: 'rastande', userId: 'other' }),
    ]
    const r = applyFeedFilter(
      data,
      { ...EMPTY_FILTER, rarities: [0], activities: ['rastande'], onlyMine: true },
      'me',
    )
    expect(r).toHaveLength(1)
  })
})

describe('deriveFilterOptions', () => {
  it('returns distinct values with counts', () => {
    const data = [
      obs({ speciesRarity: 0, activity: 'rastande', locationId: 5, locationName: 'Hammarsjön' }),
      obs({ speciesRarity: 0, activity: 'häckande', locationId: 5, locationName: 'Hammarsjön' }),
      obs({ speciesRarity: 2, activity: 'rastande', locationId: null }),
    ]
    const opts = deriveFilterOptions(data)
    expect(opts.rarities.find((r) => r.level === 0)?.count).toBe(2)
    expect(opts.rarities.find((r) => r.level === 2)?.count).toBe(1)
    expect(opts.activities.find((a) => a.value === 'rastande')?.count).toBe(2)
    expect(opts.locations).toHaveLength(1)
    expect(opts.locations[0]?.count).toBe(2)
  })

  it('sorts rarities ascending (rarest first)', () => {
    const data = [obs({ speciesRarity: 5 }), obs({ speciesRarity: 0 }), obs({ speciesRarity: 2 })]
    expect(deriveFilterOptions(data).rarities.map((r) => r.level)).toEqual([0, 2, 5])
  })

  it('buckets unlisted species (null rarity) under level 5', () => {
    const data = [obs({ speciesRarity: null }), obs({ speciesRarity: 5 })]
    const opts = deriveFilterOptions(data)
    expect(opts.rarities).toHaveLength(1)
    expect(opts.rarities[0]?.level).toBe(5)
    expect(opts.rarities[0]?.count).toBe(2)
  })

  it('omits null activities and null locations from the options', () => {
    const data = [obs({ activity: null, locationId: null })]
    const opts = deriveFilterOptions(data)
    expect(opts.activities).toHaveLength(0)
    expect(opts.locations).toHaveLength(0)
    expect(opts.rarities).toHaveLength(1)
  })
})

describe('deriveFilterOptions facet counts', () => {
  // Two rarities × two activities, so constraining one dimension provably moves
  // the other's counts.
  const data = [
    obs({ speciesRarity: 0, activity: 'rastande' }),
    obs({ speciesRarity: 0, activity: 'födosökande' }),
    obs({ speciesRarity: 5, activity: 'födosökande' }),
    obs({ speciesRarity: 5, activity: 'födosökande' }),
  ]

  it('counts a dimension against the OTHER dimensions constraints', () => {
    const opts = deriveFilterOptions(data, { ...EMPTY_FILTER, rarities: [0] })
    // Only the two rarity-0 obs are in scope for the activity facet.
    expect(opts.activities.find((a) => a.value === 'födosökande')?.count).toBe(1)
    expect(opts.activities.find((a) => a.value === 'rastande')?.count).toBe(1)
  })

  it('does not let a dimension constrain its own counts', () => {
    const opts = deriveFilterOptions(data, { ...EMPTY_FILTER, rarities: [0] })
    // Rarity 5 is still offered at its full count even though rarity 0 is the
    // active selection — swapping to it is what the chip promises, and 2 is what
    // that yields. Were the dimension allowed to constrain itself it would read 0.
    expect(opts.rarities.find((r) => r.level === 5)?.count).toBe(2)
    expect(applyFeedFilter(data, { ...EMPTY_FILTER, rarities: [5] })).toHaveLength(2)
  })

  it("every chip's count is exactly what selecting it yields", () => {
    const filter = { ...EMPTY_FILTER, rarities: [0] as RarityLevel[] }
    const opts = deriveFilterOptions(data, filter)
    for (const a of opts.activities) {
      const next = applyFeedFilter(data, { ...filter, activities: [a.value] })
      expect(next).toHaveLength(a.count)
    }
  })

  it('keeps a selected value offered at count 0 so it can be released', () => {
    const opts = deriveFilterOptions(data, {
      ...EMPTY_FILTER,
      rarities: [0],
      activities: ['sträckande'],
    })
    const stranded = opts.activities.find((a) => a.value === 'sträckande')
    expect(stranded).toBeDefined()
    expect(stranded?.count).toBe(0)
  })

  it('keeps a selected lokal offered with its name when narrowed out', () => {
    const withLokal = [
      obs({ speciesRarity: 0, locationId: 5, locationName: 'Hammarsjön' }),
      obs({ speciesRarity: 5, locationId: 7, locationName: 'Åmot' }),
    ]
    const opts = deriveFilterOptions(withLokal, {
      ...EMPTY_FILTER,
      rarities: [0],
      locationIds: [7],
    })
    expect(opts.locations.find((l) => l.id === 7)).toEqual({ id: 7, name: 'Åmot', count: 0 })
  })

  it('applies scope (onlyMine) to every facet', () => {
    const mixed = [
      obs({ userId: 'me', activity: 'rastande' }),
      obs({ userId: 'other', activity: 'rastande' }),
    ]
    const opts = deriveFilterOptions(mixed, { ...EMPTY_FILTER, onlyMine: true }, 'me')
    expect(opts.activities.find((a) => a.value === 'rastande')?.count).toBe(1)
  })

  it('is unchanged from plain totals when no filter is passed', () => {
    expect(deriveFilterOptions(data)).toEqual(deriveFilterOptions(data, EMPTY_FILTER))
  })
})

describe('activeFilterCount', () => {
  it('counts each selected value plus onlyMine', () => {
    const f = {
      onlyMine: true,
      rarities: [0, 1] as RarityLevel[],
      activities: ['rastande'] as Activity[],
      locationIds: [5],
    }
    expect(activeFilterCount(f)).toBe(5)
  })

  it('is zero for the empty filter', () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0)
  })
})
