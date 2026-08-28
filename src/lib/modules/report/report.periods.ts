import type { Money } from '@/lib/money'

/**
 * Pure period and ratio maths, kept free of any database import.
 *
 * report.service imports the Drizzle client, so anything living there needs a
 * DATABASE_URL just to be loaded — including in tests that only exercise date
 * arithmetic. These functions have no such dependency and belong on their own.
 */

/** A period as the reports use it — inclusive dates, 'YYYY-MM-DD'. */
export type Period = { from: string; to: string }

const DAY_MS = 86_400_000

export function monthToDate(now = new Date()): Period {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
}

/** Days in a period, inclusive of both ends. */
export function periodDays(period: Period): number {
  const from = new Date(period.from + 'T00:00:00Z')
  const to = new Date(period.to + 'T00:00:00Z')
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1)
}

/**
 * The equivalent span immediately before `period`.
 *
 * Deliberately the same number of days rather than "the previous calendar
 * month" — comparing a 31-day month against a 30-day one makes every figure
 * look 3% better or worse than it was.
 */
export function previousPeriod(period: Period): Period {
  const from = new Date(period.from + 'T00:00:00Z')
  const days = periodDays(period)
  const prevTo = new Date(from.getTime() - DAY_MS)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * DAY_MS)
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) }
}

/** Percentage change between two amounts, or null when there is no baseline. */
export function changeVersus(current: Money, previous: Money): number | null {
  const prev = Number(previous)
  if (prev === 0) return null
  return Math.round(((Number(current) - prev) / Math.abs(prev)) * 1000) / 10
}

/** Fleet-wide utilisation: days earning against days the fleet existed. */
export function fleetUtilisation(
  rows: { daysOnRoad: number }[],
  period: Period
): number {
  if (rows.length === 0) return 0
  const available = rows.length * periodDays(period)
  const onRoad = rows.reduce((sum, r) => sum + r.daysOnRoad, 0)
  return Math.round((onRoad / available) * 1000) / 10
}
