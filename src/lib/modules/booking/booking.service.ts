import { NotFoundError, fromDbError } from '@/lib/errors'
import * as bookingRepository from './booking.repository'
import type { CreateBookingInput, UpdateBookingInput } from './booking.validation'

export async function listBookings(tenantId: bigint) {
  return bookingRepository.listBookings(tenantId)
}

export async function getBooking(tenantId: bigint, id: bigint) {
  const booking = await bookingRepository.findBookingById(tenantId, id)
  if (!booking) throw new NotFoundError('Booking')
  return booking
}

export async function createBooking(tenantId: bigint, input: CreateBookingInput) {
  try {
    return await bookingRepository.createBooking({
      ...input,
      tenantId,
      bookingNo: `BK-${Date.now()}`,
    })
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function updateBooking(tenantId: bigint, id: bigint, input: UpdateBookingInput) {
  await getBooking(tenantId, id)
  try {
    return await bookingRepository.updateBooking(tenantId, id, input)
  } catch (err) {
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
