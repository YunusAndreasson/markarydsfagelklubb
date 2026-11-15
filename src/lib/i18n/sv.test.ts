import { describe, expect, it, vi } from 'vitest'
import { ACTIVITIES, LEGACY_ACTIVITIES } from '../validation/observation'
import { activityLabel, resetDateFormatters, sv } from './sv'

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

describe('Swedish date formatting', () => {
  const cases = [
    [new Date(2026, 10, 15, 0, 5), new Date(2026, 10, 15, 12)],
    [new Date(2026, 10, 14, 23, 59), new Date(2026, 10, 15, 12)],
    [new Date(2026, 9, 25, 2, 30), new Date(2026, 10, 15, 12)],
    [new Date(2026, 2, 29, 3, 30), new Date(2026, 10, 15, 12)],
    [new Date(2025, 11, 31, 23, 59), new Date(2026, 0, 1, 12)],
    [new Date(2024, 1, 29, 9, 35), new Date(2026, 10, 15, 12)],
  ]

  it.each(cases)('preserves date and time copy for %s', (date, now) => {
    const time = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    const weekday = date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const friendly = date.toDateString() === now.toDateString()
      ? `Idag ${time}`
      : date.toDateString() === yesterday.toDateString()
        ? `Igår ${time}`
        : `${date.toLocaleDateString('sv-SE', date.getFullYear() === now.getFullYear()
          ? { weekday: 'short', day: 'numeric', month: 'short' }
          : { day: 'numeric', month: 'short', year: 'numeric' })} ${time}`

    expect(sv.feed.timeOnly(date)).toBe(time)
    expect(sv.feed.weekday(date)).toBe(weekday)
    expect(sv.feed.fullDateTime(date)).toBe(date.toLocaleString('sv-SE', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }))
    expect(sv.observation.timeFriendly(date, now)).toBe(friendly)
  })

  it('recreates cached formats after the device timezone changes', () => {
    const DateTimeFormat = Intl.DateTimeFormat
    let timezone = 'Europe/Stockholm'
    // Vitest workers do not all respond to process.env.TZ changes. Model the
    // OS default at construction, while using real Intl formatting in each zone.
    const constructor = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales, options) {
      return new DateTimeFormat(locales, { ...options, timeZone: timezone })
    })
    try {
      resetDateFormatters()
      const date = new Date('2026-11-15T12:00:00Z')
      const timeOptions = { hour: '2-digit', minute: '2-digit' } as const
      const stockholmTime = new DateTimeFormat('sv-SE', { ...timeOptions, timeZone: timezone }).format(date)
      expect(sv.feed.timeOnly(date)).toBe(stockholmTime)
      timezone = 'America/New_York'
      const newYorkTime = new DateTimeFormat('sv-SE', { ...timeOptions, timeZone: timezone }).format(date)
      expect(newYorkTime).not.toBe(stockholmTime)
      expect(sv.feed.timeOnly(date)).toBe(stockholmTime)
      expect(constructor).toHaveBeenCalledOnce()

      resetDateFormatters()
      expect(sv.feed.timeOnly(date)).toBe(newYorkTime)
      expect(constructor).toHaveBeenCalledTimes(2)
      expect(sv.feed.weekday(date)).toBe(new DateTimeFormat('sv-SE', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone,
      }).format(date))
    } finally {
      constructor.mockRestore()
      resetDateFormatters()
    }
  })

  it('retains the previous nonthrowing behavior for invalid dates', () => {
    const date = new Date(NaN)
    const invalid = date.toLocaleString('sv-SE')
    expect(sv.feed.timeOnly(date)).toBe(invalid)
    expect(sv.feed.weekday(date)).toBe(invalid)
    expect(sv.feed.fullDateTime(date)).toBe(invalid)
    expect(sv.observation.timeFriendly(date)).toBe(`${invalid} ${invalid}`)
  })
})
