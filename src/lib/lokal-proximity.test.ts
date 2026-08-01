import { describe, expect, it } from 'vitest'
import { LOKAL_RADIUS_M, nearestLocationWithin } from './lokal-proximity'
import type { Location } from './query/locations'

/**
 * Real coordinates from the club's own data (2026-08-01), so this test pins the
 * radius against the actual geography rather than invented points.
 */
const HUALTET: Location = {
  id: 1,
  name: 'Hualtet',
  description: null,
  latitude: 56.489737,
  longitude: 13.631756,
}
const RENINGSDAMMARNA: Location = {
  id: 2,
  name: 'Reningsdammarna',
  description: null,
  latitude: 56.473444,
  longitude: 13.581194,
}
/** A lokal with no coordinates — must never be offered as a snap target. */
const NO_COORDS: Location = {
  id: 3,
  name: 'Okänd plats',
  description: null,
  latitude: null,
  longitude: null,
}

const ALL = [HUALTET, RENINGSDAMMARNA, NO_COORDS]

/** Centroid of the 31-observation residential cluster ~800 m east of Hualtet. */
const GARDEN_NEAR_HUALTET = { latitude: 56.487654, longitude: 13.644697 }

describe('nearestLocationWithin', () => {
  it('snaps a fix standing on the lokal', () => {
    const hit = nearestLocationWithin(
      HUALTET.latitude!,
      HUALTET.longitude!,
      ALL,
      LOKAL_RADIUS_M,
    )
    expect(hit?.name).toBe('Hualtet')
  })

  it('snaps a fix a couple of hundred metres away (GPS drift / big site)', () => {
    // ~200 m north of Reningsdammarna.
    const hit = nearestLocationWithin(
      RENINGSDAMMARNA.latitude! + 0.0018,
      RENINGSDAMMARNA.longitude!,
      ALL,
      LOKAL_RADIUS_M,
    )
    expect(hit?.name).toBe('Reningsdammarna')
  })

  // The regression that decides the radius. Six different members report from a
  // residential cluster 786–871 m from Hualtet and none of them call it Hualtet.
  // Any radius that captures it is too wide.
  it('does NOT snap the residential cluster ~800 m from Hualtet', () => {
    const hit = nearestLocationWithin(
      GARDEN_NEAR_HUALTET.latitude,
      GARDEN_NEAR_HUALTET.longitude,
      ALL,
      LOKAL_RADIUS_M,
    )
    expect(hit).toBeNull()
  })

  it('keeps a safety margin — the cluster stays out even at 500 m', () => {
    expect(
      nearestLocationWithin(
        GARDEN_NEAR_HUALTET.latitude,
        GARDEN_NEAR_HUALTET.longitude,
        ALL,
        500,
      ),
    ).toBeNull()
  })

  it('ignores lokaler without coordinates', () => {
    const hit = nearestLocationWithin(0, 0, [NO_COORDS], LOKAL_RADIUS_M)
    expect(hit).toBeNull()
  })

  it('resolves to the closer lokal when two are in range', () => {
    // Just off Reningsdammarna, with Hualtet ~5 km away.
    const hit = nearestLocationWithin(
      RENINGSDAMMARNA.latitude! + 0.0005,
      RENINGSDAMMARNA.longitude!,
      ALL,
      LOKAL_RADIUS_M,
    )
    expect(hit?.id).toBe(RENINGSDAMMARNA.id)
  })
})
