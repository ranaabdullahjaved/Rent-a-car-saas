import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
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

const mediaEntrySchema = z.object({
  filePath: z.string().min(1),
  mediaType: z.enum(['photo', 'video']),
  mimeType: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'fleet.manage')
    const body = await request.json()
    const parsed = createVehicleSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid vehicle')
    const media = z.array(mediaEntrySchema).default([]).safeParse(body?.media ?? [])
    if (!media.success) throw new ValidationError('Invalid media entries')

    const vehicle = await fleetService.createVehicle(tenantId, parsed.data, media.data)
    return jsonOk(vehicle, 201)
  } catch (err) {
    return apiError(err)
  }
}
