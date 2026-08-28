'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireTenant } from '@/lib/tenant'
import * as customerService from './customer.service'
import { createCustomerSchema, updateCustomerSchema } from './customer.validation'

export type CustomerActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string; field?: string }
  | { ok: false; duplicates: { id: string; fullName: string; phone: string; cnic: string | null }[] }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): CustomerActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('customer action failed', err)
  return { ok: false, message: 'Something went wrong saving this customer.' }
}

export async function createCustomerAction(
  form: FormData,
  { force = false }: { force?: boolean } = {}
): Promise<CustomerActionResult> {
  try {
    const { tenantId } = await requireTenant()

    const parsed = createCustomerSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, message: issue?.message ?? 'Check the form.', field: String(issue?.path[0] ?? '') }
    }

    // Warn before splitting one person across two records. The caller can
    // resubmit with force once they have looked at the matches.
    if (!force) {
      const matches = await customerService.findPossibleDuplicates(tenantId, {
        cnic: parsed.data.cnic,
        phone: parsed.data.phone,
      })
      if (matches.length > 0) {
        return {
          ok: false,
          duplicates: matches.map((m) => ({
            id: String(m.id),
            fullName: m.fullName,
            phone: m.phone,
            cnic: m.cnic,
          })),
        }
      }
    }

    const customer = await customerService.createCustomer(tenantId, parsed.data)
    revalidatePath('/customers')
    return { ok: true, id: String(customer!.id) }
  } catch (err) {
    return failure(err)
  }
}

export async function updateCustomerAction(
  id: string,
  form: FormData
): Promise<CustomerActionResult> {
  try {
    const { tenantId } = await requireTenant()

    const parsed = updateCustomerSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, message: issue?.message ?? 'Check the form.', field: String(issue?.path[0] ?? '') }
    }

    await customerService.updateCustomer(tenantId, BigInt(id), parsed.data)
    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)
    return { ok: true, id }
  } catch (err) {
    return failure(err)
  }
}
