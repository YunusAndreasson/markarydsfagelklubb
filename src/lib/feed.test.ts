import { describe, expect, it } from 'vitest'
import type { FeedObservation } from '@/lib/query/observations'
import { groupFeed } from './feed'

function obs(observedAt: Date, idSuffix = ''): FeedObservation {
  return {
    id: `00000000-0000-0000-0000-00000000000${idSuffix}`,
    userId: 'u',
    observedAt,
    count: 1,
    comment: null,
    latitude: null,
    longitude: null,
    createdAt: observedAt,
    speciesId: 1,
    speciesSwedishName: 'Talgoxe',
    speciesScientificName: 'Parus major',
    speciesRarity: 5,
    locationId: null,
    locationName: null,
    locationLatitude: null,
    locationLongitude: null,
    observerDisplayName: 'Test',
    imagePath: null,
    imageUrl: null,
    observerAvatarUrl: null,
    observerAvatarCacheKey: null,
    observerPhone: null,
    activity: null,
  }
}

describe('groupFeed', () => {
  const now = new Date('2026-05-29T15:00:00+02:00') // Markaryd lokal

  it('grupperar dagens observation under today', () => {
    const today = new Date('2026-05-29T08:00:00+02:00')
    const grouped = groupFeed([obs(today, '1')], now)
    expect(grouped.today).toHaveLength(1)
    expect(grouped.yesterday).toHaveLength(0)
  })

  it('grupperar gårdagens observation under yesterday', () => {
    const yesterday = new Date('2026-05-28T19:00:00+02:00')
    const grouped = groupFeed([obs(yesterday, '2')], now)
    expect(grouped.yesterday).toHaveLength(1)
    expect(grouped.today).toHaveLength(0)
  })

  it('grupperar tre dagar gammal observation under thisWeek', () => {
    const threeDaysAgo = new Date('2026-05-26T08:00:00+02:00')
    const grouped = groupFeed([obs(threeDaysAgo, '3')], now)
    expect(grouped.thisWeek).toHaveLength(1)
  })

  it('grupperar gammal observation under earlier', () => {
    const old = new Date('2026-05-10T08:00:00+02:00')
    const grouped = groupFeed([obs(old, '4')], now)
    expect(grouped.earlier).toHaveLength(1)
  })

  it('moves unchanged reports into their new buckets when the clock advances', () => {
    const reports = [obs(new Date('2026-10-23T08:25:00+02:00'))]
    expect(groupFeed(reports, new Date('2026-10-24T22:00:00+02:00')).yesterday).toHaveLength(1)
    const nextDay = groupFeed(reports, new Date('2026-10-25T10:00:00+01:00'))
    expect(nextDay.yesterday).toHaveLength(0)
    expect(nextDay.thisWeek).toHaveLength(1)
  })

  it('uses the previous Stockholm calendar day across the spring DST change', () => {
    const report = obs(new Date('2026-03-29T12:00:00+02:00'))
    expect(groupFeed([report], new Date('2026-03-30T00:30:00+02:00')).yesterday).toHaveLength(1)
  })
})
