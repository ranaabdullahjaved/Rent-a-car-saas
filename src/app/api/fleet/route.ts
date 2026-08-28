import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { createVehicleSchema } from '@/lib/modules/fleet/fleet.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const vehicles = await fleetService.listVehicles(tenantId)
    return jsonOk(vehicles)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createVehicleSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const vehicle = await fleetService.createVehicle(tenantId, parsed.data)
    return jsonOk(vehicle, 201)
  } catch (err) {
    return apiError(err)
  }
}
