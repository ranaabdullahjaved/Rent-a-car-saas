'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import * as fleetService from './fleet.service'
import { createVehicleSchema, updateVehicleSchema } from './fleet.validation'

export type FleetActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string; field?: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

/** filePath::mediaType::mimeType entries, pipe-separated by the form. */
function parseMedia(form: FormData) {
  const raw = form.get('uploadedMedia')
  if (typeof raw !== 'string' || !raw.trim()) return []
  return raw
    .split('|')
    .filter(Boolean)
    .map((entry) => {
      const [filePath, mediaType, mimeType] = entry.split('::')
      return { filePath: filePath ?? '', mediaType: mediaType ?? 'photo', mimeType: mimeType ?? 'image/jpeg' }
    })
    .filter((m) => m.filePath)
}

function failure(err: unknown): FleetActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('fleet action failed', err)
  return { ok: false, message: 'Something went wrong saving this vehicle.' }
}

export async function createVehicleAction(form: FormData): Promise<FleetActionResult> {
  try {
    // A Server Action is a public endpoint — authorise before anything else.
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'fleet.manage')

    const parsed = createVehicleSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, message: issue?.message ?? 'Check the form.', field: String(issue?.path[0] ?? '') }
    }

    const vehicle = await fleetService.createVehicle(tenantId, parsed.data, parseMedia(form))
    revalidatePath('/fleet')
    return { ok: true, id: String(vehicle!.id) }
  } catch (err) {
    return failure(err)
  }
}

export async function updateVehicleAction(id: string, form: FormData): Promise<FleetActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'fleet.manage')

    const parsed = updateVehicleSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, message: issue?.message ?? 'Check the form.', field: String(issue?.path[0] ?? '') }
    }

    await fleetService.updateVehicle(tenantId, BigInt(id), parsed.data)
    const extra = parseMedia(form)
    if (extra.length > 0) await fleetService.addVehicleMedia(tenantId, BigInt(id), extra)
    revalidatePath('/fleet')
    revalidatePath(`/fleet/${id}`)
    return { ok: true, id }
  } catch (err) {
    return failure(err)
  }
}
