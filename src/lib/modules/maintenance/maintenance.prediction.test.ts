import { describe, expect, it } from 'vitest'
import { averageDailyKm, predictService } from './maintenance.prediction'

const at = (iso: string) => new Date(iso)
const TODAY = at('2026-08-28T12:00:00Z')

const base = {
  intervalKm: 5000,
  intervalDays: null as number | null,
  lastServiceKm: 40000,
  lastServiceAt: null as string | null,
  alertBeforeKm: 500,
  alertBeforeDays: 7,
}

describe('averageDailyKm', () => {
  it('computes pace from two readings', () => {
    expect(
      averageDailyKm(
        { odometer: 40000, at: at('2026-08-01T10:00:00Z') },
        { odometer: 41500, at: at('2026-08-31T10:00:00Z') }
      )
    ).toBe(50)
  })

  it('returns null rather than guessing from bad data', () => {
    expect(averageDailyKm(null, { odometer: 41500, at: TODAY })).toBeNull()
    // Same day twice — no time elapsed.
    expect(
      averageDailyKm({ odometer: 40000, at: TODAY }, { odometer: 40100, at: TODAY })
    ).toBeNull()
    // Odometer went down — corrupt data, not a pace.
    expect(
      averageDailyKm(
        { odometer: 45000, at: at('2026-08-01T10:00:00Z') },
        { odometer: 40000, at: at('2026-08-31T10:00:00Z') }
      )
    ).toBeNull()
  })
})

describe('due by distance', () => {
  it('is ok with plenty of kilometres left at a slow pace', () => {
    const p = predictService(base, 42000, 20, TODAY)
    expect(p.dueKm).toBe(45000)
    expect(p.kmRemaining).toBe(3000)
    expect(p.status).toBe('ok')
  })

  it('is due soon inside the alert margin', () => {
    expect(predictService(base, 44600, 20, TODAY).status).toBe('due_soon')
  })

  it('is overdue past the interval', () => {
    const p = predictService(base, 45200, 20, TODAY)
    expect(p.status).toBe('overdue')
    expect(p.kmRemaining).toBe(-200)
  })

  it('projects days from the observed pace', () => {
    // 3000 km remaining at 150 km/day is 20 days out.
    expect(predictService(base, 42000, 150, TODAY).projectedDaysByKm).toBe(20)
  })

  it('turns a heavy pace into due-soon even with kilometres to spare', () => {
    // 3000 km left is comfortable — unless the car covers 500 km a day,
    // which makes the service six days away.
    expect(predictService(base, 42000, 500, TODAY).status).toBe('due_soon')
  })
})

describe('due by time', () => {
  const timed = {
    ...base,
    intervalKm: null,
    lastServiceKm: null,
    intervalDays: 180,
    lastServiceAt: '2026-03-01',
  }

  it('computes the due date from the last service', () => {
    const p = predictService(timed, 42000, null, TODAY)
    expect(p.dueDate).toBe('2026-08-28')
    expect(p.status).toBe('overdue') // due exactly today counts as overdue
  })

  it('is ok well before the date', () => {
    const p = predictService({ ...timed, lastServiceAt: '2026-06-01' }, 42000, null, TODAY)
    expect(p.dueDate).toBe('2026-11-28')
    expect(p.status).toBe('ok')
  })

  it('is due soon inside the alert window', () => {
    const p = predictService({ ...timed, lastServiceAt: '2026-03-05' }, 42000, null, TODAY)
    expect(p.dueDate).toBe('2026-09-01')
    expect(p.daysRemaining).toBe(4)
    expect(p.status).toBe('due_soon')
  })
})

describe('whichever comes first', () => {
  const both = { ...base, intervalDays: 180, lastServiceAt: '2026-03-01' }

  it('goes overdue on the date even with kilometres to spare', () => {
    // Distance says 3000 km remaining; the calendar says today. Calendar wins.
    expect(predictService(both, 42000, 10, TODAY).status).toBe('overdue')
  })

  it('goes overdue on distance even with months to spare', () => {
    const p = predictService({ ...both, lastServiceAt: '2026-08-01' }, 45500, 10, TODAY)
    expect(p.status).toBe('overdue')
  })
})

describe('unknown', () => {
  it('says so when the schedule has no usable baseline', () => {
    const p = predictService(
      { intervalKm: null, intervalDays: null, lastServiceKm: null, lastServiceAt: null, alertBeforeKm: 500, alertBeforeDays: 7 },
      42000,
      50,
      TODAY
    )
    expect(p.status).toBe('unknown')
  })
})
