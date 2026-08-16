import { describe, expect, it } from 'vitest'
import { foldIncludes, foldSearch } from './search'

describe('foldSearch', () => {
  it('lowercases', () => {
    expect(foldSearch('HAVSÖRN')).toBe('havsorn')
  })

  it('folds the Swedish letters to their base form', () => {
    expect(foldSearch('Havsörn')).toBe('havsorn')
    expect(foldSearch('Ängabäck')).toBe('angaback')
    expect(foldSearch('Åmot')).toBe('amot')
  })

  it('folds accented letters from other languages', () => {
    expect(foldSearch('Motacilla flavissima')).toBe('motacilla flavissima')
    expect(foldSearch('Señor')).toBe('senor')
    expect(foldSearch('Émile')).toBe('emile')
  })

  it('folds letters that have no decomposition', () => {
    expect(foldSearch('Sørensen')).toBe('sorensen')
    expect(foldSearch('Æsir')).toBe('asir')
    expect(foldSearch('Straße')).toBe('strasse')
  })

  it('leaves plain ASCII untouched', () => {
    expect(foldSearch('grey heron 2')).toBe('grey heron 2')
  })

  it('is idempotent', () => {
    expect(foldSearch(foldSearch('Ärtsångare'))).toBe(foldSearch('Ärtsångare'))
  })
})

describe('foldIncludes', () => {
  it('matches a needle typed without diacritics', () => {
    expect(foldIncludes('Havsörn', 'havsorn')).toBe(true)
    expect(foldIncludes('Ängabäck', 'angaback')).toBe(true)
  })

  it('still matches when the needle carries the diacritics', () => {
    expect(foldIncludes('Havsörn', 'Havsörn')).toBe(true)
    expect(foldIncludes('Havsörn', 'örn')).toBe(true)
  })

  it('matches a prefix, mid-word run and the empty needle', () => {
    expect(foldIncludes('Havsörn', 'havs')).toBe(true)
    expect(foldIncludes('Havsörn', 'vso')).toBe(true)
    expect(foldIncludes('Havsörn', '')).toBe(true)
  })

  it('does not match an unrelated needle', () => {
    expect(foldIncludes('Havsörn', 'talgoxe')).toBe(false)
  })
})
