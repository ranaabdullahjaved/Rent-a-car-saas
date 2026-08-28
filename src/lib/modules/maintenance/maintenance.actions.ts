'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import * as maintenanceService from './maintenance.service'
import { createScheduleSchema, recordJobSchema } from './maintenance.validation'

export type MaintenanceActionResult = { ok: true } | { ok: false; message: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): MaintenanceActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('maintenance action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

export async function createScheduleAction(form: FormData): Promise<MaintenanceActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'fleet.manage')

    const parsed = createScheduleSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await maintenanceService.createSchedule(tenantId, parsed.data)
    revalidatePath('/maintenance')
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function recordJobAction(form: FormData): Promise<MaintenanceActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'expenses.record')

    const parsed = recordJobSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await maintenanceService.recordJob(tenantId, parsed.data)
    revalidatePath('/maintenance')
    revalidatePath(`/fleet/${parsed.data.vehicleId}`)
    revalidatePath('/finance')
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}
