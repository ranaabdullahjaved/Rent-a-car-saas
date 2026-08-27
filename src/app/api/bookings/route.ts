import { NextRequest, NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import { createBookingSchema } from '@/lib/modules/booking/booking.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const bookings = await bookingService.listBookings(tenantId)
    return NextResponse.json({ ok: true, data: bookings })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createBookingSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const booking = await bookingService.createBooking(tenantId, parsed.data)
    return NextResponse.json({ ok: true, data: booking }, { status: 201 })
  } catch (err) {
    return errorResponse(err)
  }
}

function errorResponse(err: unknown) {
  if (err instanceof TenantError) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: err.message } },
      { status: 401 }
    )
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message } },
      { status: err.statusCode }
    )
  }
  throw err
}
