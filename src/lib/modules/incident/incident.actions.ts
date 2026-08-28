'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import * as incidentService from './incident.service'
import { recordChallanSchema, recordDamageSchema } from './incident.validation'

export type IncidentActionResult = { ok: true } | { ok: false; message: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): IncidentActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('incident action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

function revalidateAround(vehicleId: bigint, bookingId: bigint | null) {
  revalidatePath(`/fleet/${vehicleId}`)
  revalidatePath('/finance')
  if (bookingId) {
    revalidatePath(`/bookings/${bookingId}`)
    revalidatePath('/bookings')
  }
}

export async function recordDamageAction(form: FormData): Promise<IncidentActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    const parsed = recordDamageSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await incidentService.recordDamage(tenantId, parsed.data)
    revalidateAround(parsed.data.vehicleId, parsed.data.bookingId)
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function recordChallanAction(form: FormData): Promise<IncidentActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    const parsed = recordChallanSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await incidentService.recordChallan(tenantId, parsed.data)
    revalidateAround(parsed.data.vehicleId, parsed.data.bookingId)
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}
