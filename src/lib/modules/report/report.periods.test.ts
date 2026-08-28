import { describe, expect, it } from 'vitest'
import { money } from '@/lib/money'
import {
  changeVersus,
  fleetUtilisation,
  monthToDate,
  periodDays,
  previousPeriod,
} from './report.periods'

describe('periods', () => {
  it('counts an inclusive span', () => {
    expect(periodDays({ from: '2026-08-01', to: '2026-08-31' })).toBe(31)
    expect(periodDays({ from: '2026-08-01', to: '2026-08-01' })).toBe(1)
  })

  it('gives the equivalent span immediately before, for like-for-like comparison', () => {
    // August has 31 days, so the comparison window is the 31 days before it —
    // not "last calendar month", which would compare 31 days against 30.
    expect(previousPeriod({ from: '2026-08-01', to: '2026-08-31' })).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    })
  })

  it('handles a short period', () => {
    expect(previousPeriod({ from: '2026-08-10', to: '2026-08-16' })).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    })
  })

  it('never leaves a gap or an overlap between the two windows', () => {
    const current = { from: '2026-03-05', to: '2026-03-20' }
    const prev = previousPeriod(current)
    expect(periodDays(prev)).toBe(periodDays(current))
    // The previous window ends the day before the current one starts.
    const dayAfterPrev = new Date(new Date(prev.to + 'T00:00:00Z').getTime() + 86_400_000)
    expect(dayAfterPrev.toISOString().slice(0, 10)).toBe(current.from)
  })

  it('runs month-to-date from the first of the month', () => {
    const p = monthToDate(new Date('2026-08-17T12:00:00Z'))
    expect(p).toEqual({ from: '2026-08-01', to: '2026-08-17' })
  })
})

describe('changeVersus', () => {
  it('reports growth and decline', () => {
    expect(changeVersus(money('120000'), money('100000'))).toBe(20)
    expect(changeVersus(money('80000'), money('100000'))).toBe(-20)
  })

  it('returns null when there is no baseline to compare against', () => {
    // Showing "+100%" against a month with no trading would be meaningless.
    expect(changeVersus(money('50000'), money('0'))).toBeNull()
  })

  it('handles a negative baseline without flipping the sign', () => {
    // A loss that got smaller is an improvement.
    expect(changeVersus(money('-5000'), money('-10000'))).toBe(50)
  })
})

describe('fleetUtilisation', () => {
  const car = (daysOnRoad: number) => ({ daysOnRoad })

  it('is the share of available days actually earning', () => {
    // Two cars over 10 days is 20 available days; 10 on road is 50%.
    expect(fleetUtilisation([car(6), car(4)], { from: '2026-08-01', to: '2026-08-10' })).toBe(50)
  })

  it('is zero for an idle fleet and 100 for a fully booked one', () => {
    const period = { from: '2026-08-01', to: '2026-08-10' }
    expect(fleetUtilisation([car(0), car(0)], period)).toBe(0)
    expect(fleetUtilisation([car(10), car(10)], period)).toBe(100)
  })

  it('is zero rather than NaN when there are no vehicles', () => {
    expect(fleetUtilisation([], { from: '2026-08-01', to: '2026-08-10' })).toBe(0)
  })
})
