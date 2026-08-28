import { describe, expect, it } from 'vitest'
import {
  AppError,
  DoubleBookingError,
  NotFoundError,
  ValidationError,
  fromDbError,
} from './errors'

describe('fromDbError', () => {
  it('maps an exclusion violation to a 409 double booking', () => {
    // 23P01 is what no_double_booking raises. This is the single most
    // important error mapping in the product.
    const err = fromDbError({ code: '23P01', message: 'conflicting key value' })
    expect(err).toBeInstanceOf(DoubleBookingError)
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('DOUBLE_BOOKING')
    expect(err.message).toMatch(/already booked/i)
  })

  it('maps a unique violation to a 409 duplicate', () => {
    const err = fromDbError({ code: '23505', message: 'duplicate key' })
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('DUPLICATE')
  })

  it('re-throws anything it does not recognise rather than swallowing it', () => {
    const original = { code: '42703', message: 'column does not exist' }
    expect(() => fromDbError(original)).toThrow()
    // A schema bug must not be reported to the user as a booking clash.
    try {
      fromDbError(original)
    } catch (thrown) {
      expect(thrown).toBe(original)
    }
  })
})

describe('error status codes', () => {
  it('assigns the documented status per error type', () => {
    expect(new NotFoundError('Vehicle').statusCode).toBe(404)
    expect(new ValidationError('bad input').statusCode).toBe(422)
    expect(new AppError('boom', 'BOOM').statusCode).toBe(400)
  })

  it('includes the resource name in a not-found message', () => {
    expect(new NotFoundError('Vehicle').message).toBe('Vehicle not found')
  })
})
