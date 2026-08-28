import { z } from 'zod'
import { requiredId } from '@/lib/ids'

export const AGREEMENT_TYPES = ['revenue_share', 'profit_share', 'fixed_rent'] as const
export const SETTLEMENT_CYCLES = ['weekly', 'monthly', 'quarterly'] as const

export const AGREEMENT_TYPE_LABELS: Record<string, string> = {
  revenue_share: 'Share of revenue',
  profit_share: 'Share of profit after costs',
  fixed_rent: 'Fixed monthly rent',
}

const percent = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v).trim()))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter a percentage like 60 or 62.5')
  .refine((v) => Number(v) >= 0 && Number(v) <= 100, 'A share must be between 0 and 100')

const amount = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v).trim()))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 45000')

const isoDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date')

const checkbox = z
  .union([z.string(), z.boolean()])
  .nullish()
  .transform((v) => v === true || v === 'true' || v === 'on')

export const createAgreementSchema = z
  .object({
    investorId: requiredId,
    vehicleId: requiredId,
    agreementType: z.enum(AGREEMENT_TYPES).default('revenue_share'),
    sharePercent: percent,
    fixedMonthlyAmount: amount,
    settlementCycle: z.enum(SETTLEMENT_CYCLES).default('monthly'),
    investorAbsorbsMaintenance: checkbox,
    investorAbsorbsDamage: checkbox,
    investorAbsorbsChallans: checkbox,
    effectiveFrom: isoDate,
    effectiveTo: z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date or leave it open'),
    notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
  })
  // A share of nothing is not a deal, and is almost always a half-filled form.
  .refine((v) => v.agreementType === 'fixed_rent' || Number(v.sharePercent) > 0, {
    message: 'Enter the percentage the investor receives',
    path: ['sharePercent'],
  })
  .refine((v) => v.agreementType !== 'fixed_rent' || Number(v.fixedMonthlyAmount) > 0, {
    message: 'Enter the monthly rent paid to the investor',
    path: ['fixedMonthlyAmount'],
  })
  .refine((v) => v.effectiveTo === null || v.effectiveTo > v.effectiveFrom, {
    message: 'The end date must be after the start date',
    path: ['effectiveTo'],
  })

export const payoutPeriodSchema = z
  .object({
    investorId: requiredId,
    from: isoDate,
    to: isoDate,
  })
  .refine((v) => v.to >= v.from, { message: 'The end date must be after the start', path: ['to'] })

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>
export type PayoutPeriodInput = z.infer<typeof payoutPeriodSchema>

/**
 * Which ledger expense categories come off the top before an investor's share
 * is calculated, given the terms of their agreement.
 *
 * Only relevant to profit_share — a revenue share is a slice of the top line
 * by definition, and fixed rent ignores performance entirely. Getting this
 * wrong is how a payout ends up disputed, so it is derived from the agreement
 * rather than assumed.
 */
export function deductibleCategories(agreement: {
  agreementType: string
  investorAbsorbsMaintenance: boolean
  investorAbsorbsDamage: boolean
  investorAbsorbsChallans: boolean
}): string[] {
  if (agreement.agreementType !== 'profit_share') return []

  const categories: string[] = []
  if (agreement.investorAbsorbsMaintenance) categories.push('maintenance', 'fuel')
  if (agreement.investorAbsorbsDamage) categories.push('damage_repair')
  if (agreement.investorAbsorbsChallans) categories.push('challan_paid')
  return categories
}
