import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as maintenanceService from '@/lib/modules/maintenance/maintenance.service'
import { createMaintenanceRecordSchema } from '@/lib/modules/maintenance/maintenance.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const records = await maintenanceService.listMaintenanceRecords(tenantId)
    return jsonOk(records)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createMaintenanceRecordSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const record = await maintenanceService.recordMaintenance(tenantId, parsed.data)
    return jsonOk(record, 201)
  } catch (err) {
    return apiError(err)
  }
}
