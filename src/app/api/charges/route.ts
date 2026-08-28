import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import * as paymentService from '@/lib/modules/finance/payment.service'
import { recordChargeSchema } from '@/lib/modules/finance/finance.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const bookingId = request.nextUrl.searchParams.get('bookingId')
    if (!bookingId) throw new ValidationError('bookingId is required')

    return jsonOk(await bookingService.getBookingCharges(tenantId, BigInt(bookingId)))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'finance.record')
    const parsed = recordChargeSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid charge')

    const charge = await paymentService.addCharge(tenantId, parsed.data)
    return jsonOk(charge, 201)
  } catch (err) {
    return apiError(err)
  }
}
