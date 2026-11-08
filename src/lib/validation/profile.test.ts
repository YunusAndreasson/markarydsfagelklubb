import { describe, expect, it } from 'vitest'
import { digitsForTel, displayNameSchema, phoneSchema, upsertProfileInput } from './profile'

describe('displayNameSchema', () => {
  it('rejects empty', () => {
    expect(displayNameSchema.safeParse('').success).toBe(false)
  })
  it('trims whitespace', () => {
    const r = displayNameSchema.safeParse('  Anna  ')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('Anna')
  })
  it('rejects > 60 chars', () => {
    const r = displayNameSchema.safeParse('a'.repeat(61))
    expect(r.success).toBe(false)
  })
})

describe('phoneSchema', () => {
  it('accepts svenska format with spaces', () => {
    expect(phoneSchema.safeParse('070-174 06 50').success).toBe(true)
  })
  it('accepts internationella format', () => {
    expect(phoneSchema.safeParse('+46 70 174 06 50').success).toBe(true)
  })
  it('rejects strings with too few digits', () => {
    expect(phoneSchema.safeParse('1234').success).toBe(false)
  })
  it('rejects too long input', () => {
    expect(phoneSchema.safeParse('1'.repeat(31)).success).toBe(false)
  })
})

describe('digitsForTel', () => {
  it('keeps leading plus and strips formatting', () => {
    expect(digitsForTel('+46 70-174 06 50')).toBe('+46701740650')
  })
  it('drops everything but digits when no plus', () => {
    expect(digitsForTel('070-174 06 50')).toBe('0701740650')
  })
})

describe('upsertProfileInput', () => {
  it('shapes payload without phone', () => {
    const r = upsertProfileInput.safeParse({ displayName: 'Anna' })
    expect(r.success).toBe(true)
  })
  it('accepts phone', () => {
    const r = upsertProfileInput.safeParse({ displayName: 'Anna', phone: '070-174 06 50' })
    expect(r.success).toBe(true)
  })
  it('accepts null phone for explicit removal', () => {
    const r = upsertProfileInput.safeParse({ displayName: 'Anna', phone: null })
    expect(r.success).toBe(true)
  })
})
