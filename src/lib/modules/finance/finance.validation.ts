import { z } from 'zod'
import { EXPENSE_CATEGORY_KEYS, INCOME_CATEGORY_KEYS } from './ledger.categories'

export const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'jazzcash',
  'easypaisa',
  'cheque',
  'card',
] as const

export const PAYMENT_PURPOSES = [
  'booking',
  'security_deposit',
  'damage',
  'fuel',
  'late_fee',
  'challan',
  'other',
] as const

/** Purposes that are a refundable hold rather than earned revenue. */
export const DEPOSIT_PURPOSES = ['security_deposit'] as const

const requiredMoney = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')
  .refine((v) => Number(v) > 0, 'The amount must be more than zero')

export const recordPaymentSchema = z.object({
  bookingId: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  amount: requiredMoney,
  method: z.enum(PAYMENT_METHODS).default('cash'),
  purpose: z.enum(PAYMENT_PURPOSES).default('booking'),
  referenceNo: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
  paidAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : new Date()))
    .refine((d) => !Number.isNaN(d.getTime()), 'That is not a valid date'),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
})

export const recordChargeSchema = z.object({
  bookingId: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  chargeType: z.enum([
    'rental',
    'driver',
    'extra_km',
    'late_fee',
    'fuel',
    'damage',
    'challan',
    'cleaning',
    'other',
  ]),
  description: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
  quantity: z
    .union([z.string(), z.number()])
    .default(1)
    .transform((v) => String(v))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, 'Quantity must be more than zero'),
  unitAmount: requiredMoney,
})

export const promiseToPaySchema = z.object({
  bookingId: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  promisedAmount: requiredMoney,
  promisedDate: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date'),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
})

export const ledgerFilterSchema = z.object({
  direction: z.enum(['income', 'expense']).optional(),
  category: z.enum([...INCOME_CATEGORY_KEYS, ...EXPENSE_CATEGORY_KEYS] as [string, ...string[]]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vehicleId: z.union([z.string(), z.number()]).optional().transform((v) => (v ? BigInt(v) : null)),
  bookingId: z.union([z.string(), z.number()]).optional().transform((v) => (v ? BigInt(v) : null)),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type RecordChargeInput = z.infer<typeof recordChargeSchema>
export type PromiseToPayInput = z.infer<typeof promiseToPaySchema>
export type LedgerFilters = z.infer<typeof ledgerFilterSchema>

/** A security deposit is a refundable hold, never revenue. */
export function isDeposit(purpose: string): boolean {
  return (DEPOSIT_PURPOSES as readonly string[]).includes(purpose)
}

/** Maps a payment purpose to the ledger category it belongs under. */
export function ledgerCategoryForPurpose(purpose: string): string {
  switch (purpose) {
    case 'damage':
      return 'damage_recovery'
    case 'fuel':
      return 'fuel_recovery'
    case 'late_fee':
      return 'late_fee'
    case 'challan':
      return 'challan_recovery'
    default:
      return 'rental'
  }
}
