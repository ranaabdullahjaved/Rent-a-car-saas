import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import { availabilitySchema } from '@/lib/modules/booking/booking.validation'

/**
 * Which vehicles are free for a window. Advisory only — the exclusion
 * constraint decides whether a booking can actually be written, and the two
 * can legitimately disagree in the moment between this call and the insert.
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const params = request.nextUrl.searchParams
    const parsed = availabilitySchema.safeParse({
      startAt: params.get('startAt') ?? undefined,
      endAt: params.get('endAt') ?? undefined,
      bufferMinutes: params.get('bufferMinutes') ?? undefined,
      excludeBookingId: params.get('excludeBookingId') ?? undefined,
    })
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid window')

    const vehicles = await bookingService.findAvailableVehicles(
      tenantId,
      parsed.data.startAt,
      parsed.data.endAt,
      parsed.data.bufferMinutes,
      parsed.data.excludeBookingId
    )
    return jsonOk(vehicles)
  } catch (err) {
    return apiError(err)
  }
}
