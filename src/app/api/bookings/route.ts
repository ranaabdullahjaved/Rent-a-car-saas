import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import { createBookingSchema } from '@/lib/modules/booking/booking.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const bookings = await bookingService.listBookings(tenantId)
    return jsonOk(bookings)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createBookingSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const booking = await bookingService.createBooking(tenantId, parsed.data)
    return jsonOk(booking, 201)
  } catch (err) {
    return apiError(err)
  }
}
