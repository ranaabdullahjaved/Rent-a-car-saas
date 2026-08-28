import { describe, expect, it } from 'vitest'
import { buildQuote, chargeableDays } from './booking.quote'

const at = (iso: string) => new Date(iso)

describe('chargeableDays', () => {
  it('charges a whole day for a whole day', () => {
    expect(chargeableDays(at('2026-09-01T10:00:00Z'), at('2026-09-02T10:00:00Z'))).toBe(1)
  })

  it('charges two days when the car comes back two hours late', () => {
    // The car has been off the fleet into a second day, so it costs a day.
    expect(chargeableDays(at('2026-09-01T10:00:00Z'), at('2026-09-02T12:00:00Z'))).toBe(2)
  })

  it('charges a minimum of one day for a few hours', () => {
    expect(chargeableDays(at('2026-09-01T10:00:00Z'), at('2026-09-01T14:00:00Z'))).toBe(1)
  })

  it('counts a week correctly', () => {
    expect(chargeableDays(at('2026-09-01T09:00:00Z'), at('2026-09-08T09:00:00Z'))).toBe(7)
  })

  it('never returns zero or negative for an inverted range', () => {
    expect(chargeableDays(at('2026-09-05T09:00:00Z'), at('2026-09-01T09:00:00Z'))).toBe(1)
  })
})

describe('buildQuote', () => {
  const base = {
    startAt: at('2026-09-01T10:00:00Z'),
    endAt: at('2026-09-08T10:00:00Z'),
    dailyRate: '4500.50',
  }

  it('multiplies the daily rate without floating point drift', () => {
    const q = buildQuote(base)
    expect(q.chargeableDays).toBe(7)
    // 4500.50 * 7 = 31503.50 exactly; in float arithmetic this drifts.
    expect(q.total).toBe('31503.50')
  })

  it('adds the driver charge only for a chauffeur booking', () => {
    const withDriver = buildQuote({ ...base, bookingType: 'with_driver', driverChargePerDay: '1500' })
    expect(withDriver.total).toBe('42003.50')

    const selfDrive = buildQuote({ ...base, bookingType: 'self_drive', driverChargePerDay: '1500' })
    expect(selfDrive.total).toBe('31503.50')
  })

  it('subtracts a discount', () => {
    const q = buildQuote({ ...base, discountAmount: '3500' })
    expect(q.total).toBe('28003.50')
    expect(q.lines.some((l) => l.label === 'Discount' && l.amount === '-3500.00')).toBe(true)
  })

  it('keeps the deposit out of the total but in what is due at pick-up', () => {
    const q = buildQuote({ ...base, securityDeposit: '10000' })
    // A refundable hold is not revenue and must not inflate the booking total.
    expect(q.total).toBe('31503.50')
    expect(q.deposit).toBe('10000.00')
    expect(q.dueAtPickup).toBe('41503.50')
  })

  it('omits zero-valued lines rather than showing empty rows', () => {
    const q = buildQuote(base)
    expect(q.lines.map((l) => l.label)).toEqual(['Rental'])
  })

  it('handles a rate of zero without producing NaN', () => {
    const q = buildQuote({ ...base, dailyRate: '0' })
    expect(q.total).toBe('0.00')
  })

  it('composes driver charge, discount and deposit together', () => {
    const q = buildQuote({
      ...base,
      bookingType: 'with_driver',
      driverChargePerDay: '1500',
      discountAmount: '2000',
      securityDeposit: '10000',
    })
    // (4500.50 + 1500) * 7 = 42003.50, less 2000 = 40003.50
    expect(q.total).toBe('40003.50')
    expect(q.dueAtPickup).toBe('50003.50')
  })
})
