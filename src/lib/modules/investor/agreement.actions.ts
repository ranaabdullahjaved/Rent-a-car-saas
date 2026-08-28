'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import * as agreementService from './agreement.service'
import * as investorService from './investor.service'
import { createAgreementSchema } from './agreement.validation'
import { createInvestorSchema } from './investor.validation'

export type InvestorActionResult = { ok: true; id?: string } | { ok: false; message: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): InvestorActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('investor action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

export async function createInvestorAction(form: FormData): Promise<InvestorActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'investors.manage')
    const parsed = createInvestorSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    const investor = await investorService.createInvestor(tenantId, parsed.data)
    revalidatePath('/investors')
    return { ok: true, id: String(investor!.id) }
  } catch (err) {
    return failure(err)
  }
}

export async function createAgreementAction(form: FormData): Promise<InvestorActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'investors.manage')
    const parsed = createAgreementSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    await agreementService.createAgreement(tenantId, parsed.data)
    revalidatePath('/investors')
    revalidatePath(`/investors/${parsed.data.investorId}`)
    revalidatePath(`/fleet/${parsed.data.vehicleId}`)
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}
