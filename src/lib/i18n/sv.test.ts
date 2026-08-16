import { describe, expect, it } from 'vitest'
import { ACTIVITIES, LEGACY_ACTIVITIES } from '../validation/observation'
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

  // The other direction from the regression above: `activityLabel` protects us
  // from values the build PREDATES, but the picker still does a direct
  // `sv.observation.activity[value]` lookup over ACTIVITIES (picker/activity.tsx)
  // and sorts on the result. An enum value shipped without a label would be
  // `undefined` there and throw on `.localeCompare` in THIS build — so the enum
  // and the label map have to move together.
  it('has a Swedish label for every activity the picker can show', () => {
    const labels: Record<string, string | undefined> = sv.observation.activity
    const missing = [...ACTIVITIES, ...LEGACY_ACTIVITIES].filter((a) => !labels[a])
    expect(missing).toEqual([])
  })
})
