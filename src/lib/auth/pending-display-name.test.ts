import { afterEach, describe, expect, it } from 'vitest'

import {
  composeDisplayName,
  peekPendingDisplayName,
  setPendingDisplayName,
  takePendingDisplayName,
} from './pending-display-name'

afterEach(() => {
  // Reset the module-level store so cases don't leak into each other.
  setPendingDisplayName(null)
})

describe('composeDisplayName', () => {
  it('joins given + family name (Apple)', () => {
    expect(composeDisplayName(['Anna', 'Andersson'])).toBe('Anna Andersson')
  })
  it('accepts a single full-name part (Google)', () => {
    expect(composeDisplayName(['Anna Andersson'])).toBe('Anna Andersson')
  })
  it('keeps a given name when the family name is missing', () => {
    expect(composeDisplayName(['Anna', null])).toBe('Anna')
  })
  it('trims each part and collapses to a single space', () => {
    expect(composeDisplayName(['  Anna  ', '  Andersson '])).toBe('Anna Andersson')
  })
  it('returns null when nothing usable remains', () => {
    expect(composeDisplayName([null, undefined, '   '])).toBeNull()
    expect(composeDisplayName([])).toBeNull()
  })
  it('clamps to the 60-char profile limit', () => {
    expect(composeDisplayName(['a'.repeat(80)])).toHaveLength(60)
  })
})

describe('pending display name store', () => {
  it('peek reads without consuming; take reads and clears', () => {
    setPendingDisplayName('Anna Andersson')
    expect(peekPendingDisplayName()).toBe('Anna Andersson')
    expect(peekPendingDisplayName()).toBe('Anna Andersson')
    expect(takePendingDisplayName()).toBe('Anna Andersson')
    expect(peekPendingDisplayName()).toBeNull()
    expect(takePendingDisplayName()).toBeNull()
  })
})
