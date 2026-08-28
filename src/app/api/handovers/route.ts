import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as handoverService from '@/lib/modules/handover/handover.service'
import { recordHandoverSchema } from '@/lib/modules/handover/handover.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const bookingId = request.nextUrl.searchParams.get('bookingId')
    if (!bookingId) throw new ValidationError('bookingId is required')

    const what = request.nextUrl.searchParams.get('what')
    if (what === 'assessment') {
      return jsonOk(await handoverService.getReturnAssessment(tenantId, BigInt(bookingId)))
    }
    return jsonOk(await handoverService.listHandovers(tenantId, BigInt(bookingId)))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = recordHandoverSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid handover')

    return jsonOk(await handoverService.recordHandover(tenantId, parsed.data), 201)
  } catch (err) {
    return apiError(err)
  }
}
