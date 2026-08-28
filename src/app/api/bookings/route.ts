import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import {
  bookingFilterSchema,
  createBookingSchema,
} from '@/lib/modules/booking/booking.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const params = request.nextUrl.searchParams
    const filters = bookingFilterSchema.safeParse({
      q: params.get('q') ?? undefined,
      status: params.get('status') ?? undefined,
      view: params.get('view') ?? undefined,
      sort: params.get('sort') ?? undefined,
      dir: params.get('dir') ?? undefined,
    })
    if (!filters.success) throw new ValidationError(filters.error.issues[0]?.message ?? 'Bad filters')

    const rows = await bookingService.listBookings(tenantId, filters.data)
    return jsonOk(rows)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    const parsed = createBookingSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid booking')

    const booking = await bookingService.createBooking(tenantId, parsed.data)
    return jsonOk(booking, 201)
  } catch (err) {
    return apiError(err)
  }
}
