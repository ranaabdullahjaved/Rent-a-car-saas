import { AppError, DoubleBookingError, NotFoundError, fromDbError, pgErrorCode } from '@/lib/errors'
import * as bookingRepository from './booking.repository'
import { buildQuote } from './booking.quote'
import type { BookingFilters, CreateBookingInput, UpdateBookingInput } from './booking.validation'
import { blocksVehicle } from './booking.validation'

const BOOKING_NO_ATTEMPTS = 5

export async function listBookings(tenantId: bigint, filters: BookingFilters) {
  return bookingRepository.listBookings(tenantId, filters)
}

export async function getBooking(tenantId: bigint, id: bigint) {
  const row = await bookingRepository.findBookingById(tenantId, id)
  if (!row) throw new NotFoundError('Booking')
  return row
}

export async function getBookingCharges(tenantId: bigint, bookingId: bigint) {
  return bookingRepository.listBookingCharges(tenantId, bookingId)
}

export async function findAvailableVehicles(
  tenantId: bigint,
  startAt: Date,
  endAt: Date,
  bufferMinutes: number,
  excludeBookingId?: bigint | null
) {
  return bookingRepository.findAvailableVehicles(tenantId, startAt, endAt, bufferMinutes, excludeBookingId)
}

export async function getSummary(tenantId: bigint) {
  const [rows, overdue] = await Promise.all([
    bookingRepository.countByStatus(tenantId),
    bookingRepository.countOverdue(tenantId),
  ])
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]))
  return { total: rows.reduce((s, r) => s + r.count, 0), byStatus, overdue }
}

/**
 * Turns the exclusion-constraint violation into something an agent can act on.
 *
 * The constraint rejected the insert; this only looks up which booking was in
 * the way so the message can name it. If that lookup finds nothing — the
 * clashing booking was cancelled a moment ago — the generic message still
 * stands, because the database already refused the write either way.
 */
async function describeConflict(
  tenantId: bigint,
  input: { vehicleId: bigint | null; startAt: Date; endAt: Date; bufferMinutes: number },
  excludeBookingId?: bigint | null
): Promise<AppError> {
  if (!input.vehicleId) return new DoubleBookingError()

  const clash = await bookingRepository.findConflictingBooking(
    tenantId,
    input.vehicleId,
    input.startAt,
    input.endAt,
    input.bufferMinutes,
    excludeBookingId
  )
  if (!clash) return new DoubleBookingError()

  const from = clash.startAt.toISOString().slice(0, 16).replace('T', ' ')
  const to = clash.endAt.toISOString().slice(0, 16).replace('T', ' ')
  return new AppError(
    `This vehicle is already booked on ${clash.bookingNo} for ${clash.customerName}, from ${from} to ${to}.`,
    'DOUBLE_BOOKING',
    409
  )
}

function estimatedTotalFor(input: CreateBookingInput) {
  return buildQuote({
    startAt: input.startAt,
    endAt: input.endAt,
    dailyRate: input.dailyRate,
    driverChargePerDay: input.driverChargePerDay,
    bookingType: input.bookingType,
    securityDeposit: input.securityDeposit,
    discountAmount: input.discountAmount,
  })
}

export async function createBooking(tenantId: bigint, input: CreateBookingInput) {
  const quote = estimatedTotalFor(input)

  for (let attempt = 0; attempt < BOOKING_NO_ATTEMPTS; attempt++) {
    const bookingNo = await bookingRepository.nextBookingNo(tenantId, new Date())
    try {
      return await bookingRepository.createBooking({
        ...input,
        tenantId,
        bookingNo,
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        quotedDays: String(quote.chargeableDays),
        estimatedTotal: quote.total,
        notes: input.notes,
      })
    } catch (err) {
      const code = pgErrorCode(err)

      // Two agents booked in the same month at the same moment; take the next
      // number and try again rather than failing the booking.
      if (code === '23505' && attempt < BOOKING_NO_ATTEMPTS - 1) continue

      if (code === '23P01') {
        throw await describeConflict(tenantId, {
          vehicleId: input.vehicleId,
          startAt: input.startAt,
          endAt: input.endAt,
          bufferMinutes: input.bufferMinutes,
        })
      }
      throw fromDbError(err)
    }
  }

  throw new AppError('Could not allocate a booking number. Please try again.', 'BOOKING_NO_EXHAUSTED', 409)
}

export async function updateBooking(tenantId: bigint, id: bigint, input: UpdateBookingInput) {
  await getBooking(tenantId, id)
  const quote = estimatedTotalFor(input)

  try {
    return await bookingRepository.updateBooking(tenantId, id, {
      ...input,
      quotedDays: String(quote.chargeableDays),
      estimatedTotal: quote.total,
    })
  } catch (err) {
    if (pgErrorCode(err) === '23P01') {
      throw await describeConflict(
        tenantId,
        {
          vehicleId: input.vehicleId,
          startAt: input.startAt,
          endAt: input.endAt,
          bufferMinutes: input.bufferMinutes,
        },
        id
      )
    }
    throw fromDbError(err)
  }
}

export async function setStatus(tenantId: bigint, id: bigint, status: string) {
  const row = await getBooking(tenantId, id)
  const b = row.booking

  // Moving into a blocking status is the moment the vehicle is actually
  // reserved, so this is where the constraint can fire on a status change.
  if (blocksVehicle(status) && !b.vehicleId) {
    throw new AppError('Assign a vehicle before confirming this booking.', 'VEHICLE_REQUIRED', 422)
  }

  try {
    return await bookingRepository.updateBooking(tenantId, id, { status })
  } catch (err) {
    if (pgErrorCode(err) === '23P01') {
      throw await describeConflict(
        tenantId,
        {
          vehicleId: b.vehicleId,
          startAt: b.startAt,
          endAt: b.endAt,
          bufferMinutes: b.bufferMinutes,
        },
        id
      )
    }
    throw fromDbError(err)
  }
}

export async function cancelBooking(tenantId: bigint, id: bigint, reason: string) {
  await getBooking(tenantId, id)
  return bookingRepository.updateBooking(tenantId, id, {
    status: 'cancelled',
    cancellationReason: reason,
    cancelledAt: new Date(),
  })
}
