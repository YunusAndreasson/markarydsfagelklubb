import { describe, expect, it } from 'vitest'
import type { FeedObservation } from '@/lib/query/observations'
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
    locationId: null,
    locationName: null,
    locationLatitude: null,
    locationLongitude: null,
    observerDisplayName: 'Test',
    observerPhone: null,
    imagePath: null,
    imageUrl: null,
    observerAvatarUrl: null,
    activity: null,
    ...partial,
  }
}

describe('applyFeedFilter', () => {
  it('returns everything for the empty filter', () => {
    const data = [obs(), obs({ speciesId: 2 })]
    expect(applyFeedFilter(data, EMPTY_FILTER)).toHaveLength(2)
  })

  it('filters by species (OR within the dimension)', () => {
    const data = [obs({ speciesId: 1 }), obs({ speciesId: 2 }), obs({ speciesId: 3 })]
    const r = applyFeedFilter(data, { ...EMPTY_FILTER, speciesIds: [1, 3] })
    expect(r.map((o) => o.speciesId).sort()).toEqual([1, 3])
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
      obs({ speciesId: 1, activity: 'rastande', userId: 'me' }),
      obs({ speciesId: 1, activity: 'häckande', userId: 'me' }),
      obs({ speciesId: 2, activity: 'rastande', userId: 'me' }),
      obs({ speciesId: 1, activity: 'rastande', userId: 'other' }),
    ]
    const r = applyFeedFilter(
      data,
      { ...EMPTY_FILTER, speciesIds: [1], activities: ['rastande'], onlyMine: true },
      'me',
    )
    expect(r).toHaveLength(1)
  })
})

describe('deriveFilterOptions', () => {
  it('returns distinct values with counts', () => {
    const data = [
      obs({ speciesId: 1, speciesSwedishName: 'Talgoxe', activity: 'rastande', locationId: 5, locationName: 'Hammarsjön' }),
      obs({ speciesId: 1, speciesSwedishName: 'Talgoxe', activity: 'häckande', locationId: 5, locationName: 'Hammarsjön' }),
      obs({ speciesId: 2, speciesSwedishName: 'Blåmes', activity: 'rastande', locationId: null }),
    ]
    const opts = deriveFilterOptions(data)
    expect(opts.species.find((s) => s.id === 1)?.count).toBe(2)
    expect(opts.species.find((s) => s.id === 2)?.count).toBe(1)
    expect(opts.activities.find((a) => a.value === 'rastande')?.count).toBe(2)
    expect(opts.locations).toHaveLength(1)
    expect(opts.locations[0]?.count).toBe(2)
  })

  it('sorts species and locations by Swedish name', () => {
    const data = [
      obs({ speciesId: 1, speciesSwedishName: 'Ärla' }),
      obs({ speciesId: 2, speciesSwedishName: 'Bofink' }),
      obs({ speciesId: 3, speciesSwedishName: 'Domherre' }),
    ]
    expect(deriveFilterOptions(data).species.map((s) => s.swedishName)).toEqual([
      'Bofink',
      'Domherre',
      'Ärla',
    ])
  })

  it('omits null activities and null locations from the options', () => {
    const data = [obs({ activity: null, locationId: null })]
    const opts = deriveFilterOptions(data)
    expect(opts.activities).toHaveLength(0)
    expect(opts.locations).toHaveLength(0)
    expect(opts.species).toHaveLength(1)
  })
})

describe('activeFilterCount', () => {
  it('counts each selected value plus onlyMine', () => {
    const f = {
      onlyMine: true,
      speciesIds: [1, 2],
      activities: ['rastande'] as Activity[],
      locationIds: [5],
    }
    expect(activeFilterCount(f)).toBe(5)
  })

  it('is zero for the empty filter', () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0)
  })
})
