'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireTenant } from '@/lib/tenant'
import * as expenseService from './expense.service'
import * as paymentService from './payment.service'
import { promiseToPaySchema, recordChargeSchema, recordPaymentSchema } from './finance.validation'
import { recordExpenseSchema } from './expense.validation'

export type FinanceActionResult = { ok: true } | { ok: false; message: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): FinanceActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('finance action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

function revalidateBooking(bookingId: string) {
  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath('/bookings')
  revalidatePath('/finance')
}

export async function recordPaymentAction(form: FormData): Promise<FinanceActionResult> {
  try {
    const { tenantId } = await requireTenant()
    const parsed = recordPaymentSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await paymentService.recordPayment(tenantId, parsed.data)
    revalidateBooking(String(parsed.data.bookingId))
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function addChargeAction(form: FormData): Promise<FinanceActionResult> {
  try {
    const { tenantId } = await requireTenant()
    const parsed = recordChargeSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await paymentService.addCharge(tenantId, parsed.data)
    revalidateBooking(String(parsed.data.bookingId))
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function promiseToPayAction(form: FormData): Promise<FinanceActionResult> {
  try {
    const { tenantId } = await requireTenant()
    const parsed = promiseToPaySchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await paymentService.promiseToPay(tenantId, parsed.data)
    revalidateBooking(String(parsed.data.bookingId))
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

export async function recordExpenseAction(form: FormData): Promise<FinanceActionResult> {
  try {
    const { tenantId } = await requireTenant()
    const parsed = recordExpenseSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await expenseService.recordExpense(tenantId, parsed.data)
    revalidatePath('/finance')
    if (parsed.data.vehicleId) revalidatePath(`/fleet/${parsed.data.vehicleId}`)
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}
