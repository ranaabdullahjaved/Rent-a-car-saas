import { describe, expect, it } from 'vitest'
import { blocksVehicle, createBookingSchema, updateBookingSchema } from './booking.validation'

// Relative dates: createBookingSchema rejects the past, so fixed fixtures
// would start failing the day they age out.
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

const base = {
  customerId: '1',
  vehicleId: '1',
  startAt: days(7),
  endAt: days(14),
  dailyRate: '4500',
}

describe('blocksVehicle', () => {
  it('matches the statuses the exclusion constraint actually covers', () => {
    // If these drift from the constraint predicate, the UI will claim a car is
    // held when the database is not holding it.
    expect(blocksVehicle('confirmed')).toBe(true)
    expect(blocksVehicle('dispatched')).toBe(true)
    expect(blocksVehicle('active')).toBe(true)

    expect(blocksVehicle('tentative')).toBe(false)
    expect(blocksVehicle('completed')).toBe(false)
    expect(blocksVehicle('cancelled')).toBe(false)
  })
})

describe('date range', () => {
  it('rejects a return before the pick-up', () => {
    const parsed = createBookingSchema.safeParse({
      ...base,
      startAt: days(14),
      endAt: days(7),
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['endAt'])
  })

  it('rejects a zero-length booking', () => {
    expect(
      createBookingSchema.safeParse({ ...base, endAt: base.startAt }).success
    ).toBe(false)
  })

  it('rejects a pick-up in the past on a new booking', () => {
    const parsed = createBookingSchema.safeParse({ ...base, startAt: days(-2) })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.path[0])).toContain('startAt')
    }
  })

  it('rejects a return in the past on a new booking', () => {
    const parsed = createBookingSchema.safeParse({ ...base, startAt: days(-9), endAt: days(-2) })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.path[0])).toContain('endAt')
    }
  })

  it('gives a few minutes of grace for a pick-up happening right now', () => {
    const justNow = new Date(Date.now() - 60_000).toISOString()
    expect(createBookingSchema.safeParse({ ...base, startAt: justNow }).success).toBe(true)
  })

  it('lets an edit keep dates that are now in the past', () => {
    // A booking taken last week has a past pick-up; editing it must not fail.
    expect(
      updateBookingSchema.safeParse({ ...base, startAt: days(-9), endAt: days(-2) }).success
    ).toBe(true)
  })
})

describe('vehicle requirement', () => {
  it('requires a vehicle to confirm a booking', () => {
    const parsed = createBookingSchema.safeParse({ ...base, vehicleId: '', status: 'confirmed' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['vehicleId'])
  })

  it('allows a tentative booking with no vehicle yet', () => {
    expect(createBookingSchema.safeParse({ ...base, vehicleId: '', status: 'tentative' }).success).toBe(
      true
    )
  })

  it('allows an outsourced booking with no vehicle, since the car is not ours', () => {
    expect(
      createBookingSchema.safeParse({
        ...base,
        vehicleId: '',
        source: 'outsourced',
        status: 'confirmed',
      }).success
    ).toBe(true)
  })
})

describe('driver assignment', () => {
  it('rejects a driver on a self-drive booking', () => {
    const parsed = createBookingSchema.safeParse({
      ...base,
      bookingType: 'self_drive',
      driverId: '4',
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['driverId'])
  })

  it('allows a driver on a chauffeur booking', () => {
    expect(
      createBookingSchema.safeParse({ ...base, bookingType: 'with_driver', driverId: '4' }).success
    ).toBe(true)
  })

  it('allows a chauffeur booking before a driver is assigned', () => {
    expect(
      createBookingSchema.safeParse({ ...base, bookingType: 'with_driver', driverId: '' }).success
    ).toBe(true)
  })
})

describe('money fields', () => {
  it('accepts whole and two-decimal amounts', () => {
    expect(createBookingSchema.safeParse({ ...base, dailyRate: '4500' }).success).toBe(true)
    expect(createBookingSchema.safeParse({ ...base, dailyRate: '4500.50' }).success).toBe(true)
  })

  it('rejects a non-numeric rate rather than storing garbage', () => {
    expect(createBookingSchema.safeParse({ ...base, dailyRate: 'four thousand' }).success).toBe(false)
  })

  it('defaults blank optional amounts to zero', () => {
    const parsed = createBookingSchema.parse({ ...base, securityDeposit: '', discountAmount: '' })
    expect(parsed.securityDeposit).toBe('0')
    expect(parsed.discountAmount).toBe('0')
  })
})
