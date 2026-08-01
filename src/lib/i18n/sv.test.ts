import { describe, expect, it } from 'vitest'
import { activityLabel, sv } from './sv'

describe('activityLabel', () => {
  it('resolves a known activity to its Swedish label', () => {
    expect(activityLabel('rastande')).toBe('Rastande')
  })

  it('resolves legacy keys kept for historical observations', () => {
    expect(activityLabel('spelande')).toBe(sv.observation.activity.spelande)
  })

  // Regression: `observations.activity` is free text + a CHECK constraint on the
  // SHARED database, so values are added server-side while older builds are still
  // installed. A direct `sv.observation.activity[x]` lookup returned `undefined`
  // for such a value, and the filter sheet sorts on the label — the resulting
  // `undefined.localeCompare(...)` threw mid-render and killed the app on the feed
  // screen for every Android user the day `svårsedd` was first reported.
  it('never returns undefined for an activity the build predates', () => {
    const label = activityLabel('enHeltNyAktivitet')
    expect(label).toBe('enHeltNyAktivitet')
    expect(() => label.localeCompare('Rastande', 'sv')).not.toThrow()
  })

  it('keeps a list of mixed known/unknown activities sortable', () => {
    const sorted = ['rastande', 'enHeltNyAktivitet', 'häckande']
      .map((value) => ({ value, label: activityLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'sv'))
    expect(sorted.map((o) => o.value)).toHaveLength(3)
  })
})
