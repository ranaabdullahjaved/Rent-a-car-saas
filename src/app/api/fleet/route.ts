import { NextRequest, NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { createVehicleSchema } from '@/lib/modules/fleet/fleet.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const vehicles = await fleetService.listVehicles(tenantId)
    return NextResponse.json({ ok: true, data: vehicles })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createVehicleSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const vehicle = await fleetService.createVehicle(tenantId, parsed.data)
    return NextResponse.json({ ok: true, data: vehicle }, { status: 201 })
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
