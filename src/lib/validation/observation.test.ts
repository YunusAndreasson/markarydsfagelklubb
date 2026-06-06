import { describe, expect, it } from 'vitest'
import { createObservationInput, updateObservationInput } from './observation'

const validBase = {
  speciesId: 1,
  count: 1,
  observedAt: new Date(),
  locationId: 5,
  activity: 'stationär' as const,
}

describe('activity', () => {
  it('rejects a missing activity', () => {
    const { activity: _omit, ...noActivity } = validBase
    expect(createObservationInput.safeParse(noActivity).success).toBe(false)
  })
})

describe('createObservationInput', () => {
  it('accepts minimum required fields (incl. a location)', () => {
    expect(createObservationInput.safeParse(validBase).success).toBe(true)
  })

  it('rejects when no location is given', () => {
    const { locationId: _omit, ...noLocation } = validBase
    const r = createObservationInput.safeParse(noLocation)
    expect(r.success).toBe(false)
  })

  it('rejects count < 1', () => {
    const r = createObservationInput.safeParse({ ...validBase, count: 0 })
    expect(r.success).toBe(false)
  })

  it('rejects future observedAt', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000)
    const r = createObservationInput.safeParse({
      ...validBase,
      observedAt: future,
    })
    expect(r.success).toBe(false)
  })

  it('accepts a locationId without coords', () => {
    const r = createObservationInput.safeParse({ ...validBase, locationId: 5 })
    expect(r.success).toBe(true)
  })

  it('accepts coords without a locationId', () => {
    const { locationId: _omit, ...noLocation } = validBase
    const r = createObservationInput.safeParse({
      ...noLocation,
      latitude: 56.46,
      longitude: 13.6,
    })
    expect(r.success).toBe(true)
  })

  it('rejects both locationId and coords together', () => {
    const r = createObservationInput.safeParse({
      ...validBase,
      locationId: 5,
      latitude: 56.46,
      longitude: 13.6,
    })
    expect(r.success).toBe(false)
  })

  it('rejects half coords (lat only)', () => {
    const r = createObservationInput.safeParse({
      ...validBase,
      latitude: 56.46,
    })
    expect(r.success).toBe(false)
  })

  it('trims and normalises comment', () => {
    const r = createObservationInput.safeParse({
      ...validBase,
      comment: '   hej   ',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBe('hej')
  })

  it('returns null for empty comment string', () => {
    const r = createObservationInput.safeParse({
      ...validBase,
      comment: '   ',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.comment).toBeNull()
  })
})

describe('updateObservationInput', () => {
  it('requires id', () => {
    const r = updateObservationInput.safeParse(validBase)
    expect(r.success).toBe(false)
  })

  it('accepts valid id + fields', () => {
    const r = updateObservationInput.safeParse({
      ...validBase,
      id: '00000000-0000-0000-0000-000000000000',
    })
    expect(r.success).toBe(true)
  })
})
