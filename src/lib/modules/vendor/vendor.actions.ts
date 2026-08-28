'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import * as vendorService from './vendor.service'
import { createVendorSchema, setOutsourcingSchema } from './vendor.validation'

export type VendorActionResult = { ok: true; id?: string } | { ok: false; message: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): VendorActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('vendor action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

export async function createVendorAction(form: FormData): Promise<VendorActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'fleet.manage')
    const parsed = createVendorSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    const vendor = await vendorService.createVendor(tenantId, parsed.data)
    revalidatePath('/vendors')
    return { ok: true, id: String(vendor!.id) }
  } catch (err) {
    return failure(err)
  }
}

export async function setOutsourcingAction(form: FormData): Promise<VendorActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'bookings.manage')
    const parsed = setOutsourcingSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await vendorService.setOutsourcing(tenantId, parsed.data)
    revalidatePath(`/bookings/${parsed.data.bookingId}`)
    revalidatePath('/bookings')
    revalidatePath('/finance')
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}
