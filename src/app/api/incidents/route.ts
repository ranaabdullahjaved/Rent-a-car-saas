import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as incidentService from '@/lib/modules/incident/incident.service'
import {
  recordChallanSchema,
  recordDamageSchema,
} from '@/lib/modules/incident/incident.validation'

function idParam(v: string | null) {
  return v ? BigInt(v) : undefined
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const params = request.nextUrl.searchParams
    const kind = params.get('kind') ?? 'damage'
    const filters = {
      vehicleId: idParam(params.get('vehicleId')),
      bookingId: idParam(params.get('bookingId')),
    }

    if (kind === 'challan') return jsonOk(await incidentService.listChallans(tenantId, filters))
    if (kind === 'blockers') {
      const bookingId = idParam(params.get('bookingId'))
      if (!bookingId) throw new ValidationError('bookingId is required')
      return jsonOk(await incidentService.getClosureBlockers(tenantId, bookingId))
    }
    return jsonOk(await incidentService.listDamage(tenantId, filters))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    const body = await request.json()
    const kind = request.nextUrl.searchParams.get('kind') ?? 'damage'

    if (kind === 'challan') {
      const parsed = recordChallanSchema.safeParse(body)
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid challan')
      return jsonOk(await incidentService.recordChallan(tenantId, parsed.data), 201)
    }

    const parsed = recordDamageSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid damage')
    return jsonOk(await incidentService.recordDamage(tenantId, parsed.data), 201)
  } catch (err) {
    return apiError(err)
  }
}
