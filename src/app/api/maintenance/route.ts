import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as maintenanceService from '@/lib/modules/maintenance/maintenance.service'
import {
  createScheduleSchema,
  recordJobSchema,
} from '@/lib/modules/maintenance/maintenance.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const what = request.nextUrl.searchParams.get('what') ?? 'fleet'

    if (what === 'jobs') return jsonOk(await maintenanceService.listRecentJobs(tenantId))
    return jsonOk(await maintenanceService.getFleetMaintenance(tenantId))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    const body = await request.json()

    if (request.nextUrl.searchParams.get('what') === 'schedule') {
      requireCan({ role }, 'fleet.manage')
      const parsed = createScheduleSchema.safeParse(body)
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid schedule')
      return jsonOk(await maintenanceService.createSchedule(tenantId, parsed.data), 201)
    }

    // Recording a job posts money to the ledger, so it needs the expense
    // capability rather than the fleet one.
    requireCan({ role }, 'expenses.record')
    const parsed = recordJobSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid job')
    return jsonOk(await maintenanceService.recordJob(tenantId, parsed.data), 201)
  } catch (err) {
    return apiError(err)
  }
}
