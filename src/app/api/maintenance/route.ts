import { NextRequest, NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import * as maintenanceService from '@/lib/modules/maintenance/maintenance.service'
import { createMaintenanceRecordSchema } from '@/lib/modules/maintenance/maintenance.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const records = await maintenanceService.listMaintenanceRecords(tenantId)
    return NextResponse.json({ ok: true, data: records })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createMaintenanceRecordSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const record = await maintenanceService.recordMaintenance(tenantId, parsed.data)
    return NextResponse.json({ ok: true, data: record }, { status: 201 })
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
