import type { FeedObservation } from '@/lib/query/observations'

const STOCKHOLM_TZ = 'Europe/Stockholm'

// Constructing Intl formatters is expensive on Hermes. The locale and zone are
// fixed, so one formatter can serve every report and every subsequent refresh.
const stockholmDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: STOCKHOLM_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD i Europe/Stockholm-tid (kalender­dygn). */
function stockholmDateKey(d: Date): string {
  const parts = stockholmDateFormatter.formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const da = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${da}`
}

export type FeedBucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier'

export type GroupedFeed = Record<FeedBucket, FeedObservation[]>

/**
 * Gruppera flödet utifrån svenskt kalenderdygn:
 *  - today:     samma dygn som nu
 *  - yesterday: dygnet före
 *  - thisWeek:  inom senaste 7 dygnen (men ej idag/igår)
 *  - earlier:   resten
 */
export function groupFeed(observations: FeedObservation[], now: Date = new Date()): GroupedFeed {
  const todayKey = stockholmDateKey(now)
  // Move one calendar day, rather than 24 hours: Stockholm's spring DST day
  // has only 23 hours, so subtracting 24 can skip yesterday near midnight.
  const yesterday = new Date(`${todayKey}T12:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const grouped: GroupedFeed = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  }

  for (const obs of observations) {
    const d = new Date(obs.observedAt)
    const key = stockholmDateKey(d)
    if (key === todayKey) grouped.today.push(obs)
    else if (key === yesterdayKey) grouped.yesterday.push(obs)
    else if (d.getTime() >= sevenDaysAgo.getTime()) grouped.thisWeek.push(obs)
    else grouped.earlier.push(obs)
  }

  return grouped
}
