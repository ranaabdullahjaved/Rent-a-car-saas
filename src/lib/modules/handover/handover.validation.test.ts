import { describe, expect, it } from 'vitest'
import {
  REQUIRED_ANGLES,
  assessReturn,
  fuelLabel,
  missingAngles,
  recordHandoverSchema,
} from './handover.validation'

const at = (iso: string) => new Date(iso)

const baseReturn = {
  odometerOut: 45000,
  odometerIn: 45600,
  fuelOutEighths: 8,
  fuelInEighths: 8,
  scheduledEnd: at('2026-09-05T10:00:00Z'),
  actualEnd: at('2026-09-05T10:00:00Z'),
  allowedKmPerDay: null,
  chargeableDays: 4,
  extraKmRate: '0',
  tankCapacityLitres: '45',
  fuelRatePerLitre: '280',
  latePenaltyPerHour: '500',
  lateGraceMinutes: 60,
}

describe('required angles', () => {
  it('lists what is still missing', () => {
    expect(missingAngles(['front_left', 'odometer'])).toEqual([
      'front_right',
      'rear_left',
      'rear_right',
      'left_side',
      'right_side',
      'interior',
    ])
  })

  it('is satisfied only by the complete set', () => {
    expect(missingAngles([...REQUIRED_ANGLES])).toEqual([])
  })

  it('ignores extra optional shots', () => {
    expect(missingAngles([...REQUIRED_ANGLES, 'walkaround_video', 'damage_detail'])).toEqual([])
  })

  it('demands all eight from an empty capture', () => {
    expect(missingAngles([])).toHaveLength(8)
  })

  it('accepts a walkaround video in place of all eight photos', () => {
    expect(missingAngles(['walkaround_video'])).toEqual([])
    expect(missingAngles(['walkaround_video', 'front_left'])).toEqual([])
  })
})

describe('kilometres', () => {
  it('counts what was driven', () => {
    expect(assessReturn(baseReturn).kilometresDriven).toBe(600)
  })

  it('charges nothing extra when there is no daily allowance', () => {
    const a = assessReturn({ ...baseReturn, extraKmRate: '25' })
    expect(a.extraKilometres).toBe(0)
    expect(a.extraKmCharge).toBe('0.00')
  })

  it('charges only the kilometres beyond the allowance', () => {
    // 100/day over 4 days is 400 allowed; 600 driven is 200 over.
    const a = assessReturn({ ...baseReturn, allowedKmPerDay: 100, extraKmRate: '25' })
    expect(a.extraKilometres).toBe(200)
    expect(a.extraKmCharge).toBe('5000.00')
  })

  it('charges nothing when the car stayed within the allowance', () => {
    const a = assessReturn({ ...baseReturn, allowedKmPerDay: 200, extraKmRate: '25' })
    expect(a.extraKilometres).toBe(0)
  })
})

describe('fuel', () => {
  it('charges the shortfall against the tank', () => {
    // Out full, back at half: 4/8 of a 45-litre tank is 22.5 litres at 280.
    const a = assessReturn({ ...baseReturn, fuelInEighths: 4 })
    expect(a.fuelShortfallEighths).toBe(4)
    expect(a.fuelCharge).toBe('6300.00')
  })

  it('charges nothing when the car comes back fuller than it left', () => {
    // Never a refund — the operator asked about compensation for loss only.
    const a = assessReturn({ ...baseReturn, fuelOutEighths: 4, fuelInEighths: 8 })
    expect(a.fuelShortfallEighths).toBe(0)
    expect(a.fuelCharge).toBe('0.00')
  })

  it('charges nothing when a reading is missing rather than guessing', () => {
    expect(assessReturn({ ...baseReturn, fuelInEighths: null }).fuelCharge).toBe('0.00')
  })

  it('charges nothing when the tank capacity is unknown', () => {
    const a = assessReturn({ ...baseReturn, fuelInEighths: 4, tankCapacityLitres: null })
    expect(a.fuelShortfallEighths).toBe(4)
    expect(a.fuelCharge).toBe('0.00')
  })
})

describe('lateness', () => {
  it('is free inside the grace period', () => {
    const a = assessReturn({ ...baseReturn, actualEnd: at('2026-09-05T10:45:00Z') })
    expect(a.hoursLate).toBe(0)
    expect(a.lateCharge).toBe('0.00')
  })

  it('charges from the end of the grace period, not the scheduled time', () => {
    // 2h30 late, 60 minutes forgiven, 1h30 chargeable -> 2 hours.
    const a = assessReturn({ ...baseReturn, actualEnd: at('2026-09-05T12:30:00Z') })
    expect(a.hoursLate).toBe(2)
    expect(a.lateCharge).toBe('1000.00')
  })

  it('rounds part of an hour up, since the car was unavailable for it', () => {
    const a = assessReturn({ ...baseReturn, actualEnd: at('2026-09-05T11:01:00Z') })
    expect(a.hoursLate).toBe(1)
  })

  it('charges nothing for an early return', () => {
    const a = assessReturn({ ...baseReturn, actualEnd: at('2026-09-04T10:00:00Z') })
    expect(a.hoursLate).toBe(0)
  })
})

describe('the whole assessment', () => {
  it('adds the three charges exactly', () => {
    const a = assessReturn({
      ...baseReturn,
      allowedKmPerDay: 100,
      extraKmRate: '25',
      fuelInEighths: 4,
      actualEnd: at('2026-09-05T12:30:00Z'),
    })
    // 5,000 extra km + 6,300 fuel + 1,000 late
    expect(a.total).toBe('12300.00')
  })

  it('is zero for a clean return', () => {
    expect(assessReturn(baseReturn).total).toBe('0.00')
  })
})

describe('fuelLabel', () => {
  it('reads the gauge the way a person would', () => {
    expect(fuelLabel(8)).toBe('Full')
    expect(fuelLabel(4)).toBe('½')
    expect(fuelLabel(0)).toBe('Empty')
    expect(fuelLabel(3)).toBe('3/8')
    expect(fuelLabel(null)).toBe('not recorded')
  })
})

describe('handover input', () => {
  const base = { bookingId: '1', handoverType: 'checkout', odometer: '45000' }

  it('accepts captured angles as a comma-separated list from a form', () => {
    const parsed = recordHandoverSchema.parse({ ...base, capturedAngles: 'front_left,odometer' })
    expect(parsed.capturedAngles).toEqual(['front_left', 'odometer'])
  })

  it('rejects a negative or fractional odometer', () => {
    expect(recordHandoverSchema.safeParse({ ...base, odometer: '-5' }).success).toBe(false)
    expect(recordHandoverSchema.safeParse({ ...base, odometer: '45000.5' }).success).toBe(false)
  })

  it('keeps fuel within the eight eighths of a gauge', () => {
    expect(recordHandoverSchema.safeParse({ ...base, fuelLevelEighths: '9' }).success).toBe(false)
    expect(recordHandoverSchema.safeParse({ ...base, fuelLevelEighths: '8' }).success).toBe(true)
    expect(recordHandoverSchema.parse({ ...base, fuelLevelEighths: '' }).fuelLevelEighths).toBeNull()
  })
})
