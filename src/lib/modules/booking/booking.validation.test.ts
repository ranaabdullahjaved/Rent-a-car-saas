import { describe, expect, it } from 'vitest'
import { blocksVehicle, createBookingSchema } from './booking.validation'

const base = {
  customerId: '1',
  vehicleId: '1',
  startAt: '2026-09-01T10:00:00Z',
  endAt: '2026-09-08T10:00:00Z',
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
      startAt: '2026-09-08T10:00:00Z',
      endAt: '2026-09-01T10:00:00Z',
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['endAt'])
  })

  it('rejects a zero-length booking', () => {
    expect(
      createBookingSchema.safeParse({ ...base, endAt: base.startAt }).success
    ).toBe(false)
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
