import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { createVehicleSchema, fleetFilterSchema } from '@/lib/modules/fleet/fleet.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const params = request.nextUrl.searchParams
    const filters = fleetFilterSchema.safeParse({
      q: params.get('q') ?? undefined,
      status: params.get('status') ?? undefined,
      ownershipType: params.get('ownershipType') ?? undefined,
      sort: params.get('sort') ?? undefined,
      dir: params.get('dir') ?? undefined,
    })
    if (!filters.success) throw new ValidationError(filters.error.issues[0]?.message ?? 'Bad filters')

    const vehicles = await fleetService.listVehicles(tenantId, filters.data)
    return jsonOk(vehicles)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createVehicleSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid vehicle')

    const vehicle = await fleetService.createVehicle(tenantId, parsed.data)
    return jsonOk(vehicle, 201)
  } catch (err) {
    return apiError(err)
  }
}
