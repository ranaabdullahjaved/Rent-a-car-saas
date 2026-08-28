'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import * as bookingService from './booking.service'
import { createBookingSchema } from './booking.validation'

export type BookingActionResult =
  | { ok: true; id: string; bookingNo: string }
  | { ok: false; message: string; field?: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): BookingActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('booking action failed', err)
  return { ok: false, message: 'Something went wrong saving this booking.' }
}

export async function createBookingAction(form: FormData): Promise<BookingActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')

    const parsed = createBookingSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, message: issue?.message ?? 'Check the form.', field: String(issue?.path[0] ?? '') }
    }

    const booking = await bookingService.createBooking(tenantId, parsed.data)
    revalidatePath('/bookings')
    revalidatePath('/fleet')
    return { ok: true, id: String(booking!.id), bookingNo: booking!.bookingNo }
  } catch (err) {
    return failure(err)
  }
}

export async function setBookingStatusAction(
  id: string,
  status: string
): Promise<BookingActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    const booking = await bookingService.setStatus(tenantId, BigInt(id), status)
    revalidatePath('/bookings')
    revalidatePath(`/bookings/${id}`)
    return { ok: true, id, bookingNo: booking!.bookingNo }
  } catch (err) {
    return failure(err)
  }
}

export async function cancelBookingAction(
  id: string,
  reason: string
): Promise<BookingActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    if (!reason.trim()) return { ok: false, message: 'Give a reason for cancelling.' }

    const booking = await bookingService.cancelBooking(tenantId, BigInt(id), reason.trim())
    revalidatePath('/bookings')
    revalidatePath(`/bookings/${id}`)
    return { ok: true, id, bookingNo: booking!.bookingNo }
  } catch (err) {
    return failure(err)
  }
}
