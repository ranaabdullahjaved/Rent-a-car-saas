import { z } from 'zod'
import { optionalId } from '@/lib/ids'
import { EXPENSE_CATEGORY_KEYS } from './ledger.categories'
import { PAYMENT_METHODS } from './finance.validation'

/**
 * An expense's category IS its ledger category — there is no second taxonomy
 * to keep in step. Investor payouts and vendor settlements are deliberately
 * excluded: those are produced by their own modules, which know how to compute
 * them, and recording one by hand here would bypass that.
 */
export const RECORDABLE_EXPENSE_CATEGORIES = EXPENSE_CATEGORY_KEYS.filter(
  (c) => c !== 'investor_payout' && c !== 'deposit_refund'
)

/** Costs that belong to a specific car rather than the business as a whole. */
export const VEHICLE_ATTRIBUTABLE = ['maintenance', 'fuel', 'challan_paid', 'instalment'] as const

export function isVehicleAttributable(category: string): boolean {
  return (VEHICLE_ATTRIBUTABLE as readonly string[]).includes(category)
}

const requiredMoney = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')
  .refine((v) => Number(v) > 0, 'The amount must be more than zero')

export const recordExpenseSchema = z
  .object({
    category: z.enum(RECORDABLE_EXPENSE_CATEGORIES as [string, ...string[]]),
    amount: requiredMoney,
    expenseDate: z
      .string()
      .trim()
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date'),
    paymentMethod: z.enum(PAYMENT_METHODS).default('cash'),
    paidTo: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
    description: z.string().trim().max(400).optional().transform((v) => (v ? v : null)),
    vehicleId: optionalId,
    employeeId: optionalId,
    vendorId: optionalId,
    isRecurring: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((v) => v === true || v === 'true' || v === 'on'),
  })
  // Per-car profitability is only meaningful if the costs that belong to a car
  // are actually attached to it. A fuel or maintenance expense with no vehicle
  // silently becomes overhead and quietly flatters every car's margin.
  .refine((v) => !isVehicleAttributable(v.category) || v.vehicleId !== null, {
    message: 'Choose the vehicle this cost belongs to',
    path: ['vehicleId'],
  })
  .refine((v) => v.category !== 'salary' || v.employeeId !== null, {
    message: 'Choose the employee this salary is for',
    path: ['employeeId'],
  })

export const expenseFilterSchema = z.object({
  category: z.string().optional(),
  vehicleId: optionalId,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>
export type ExpenseFilters = z.infer<typeof expenseFilterSchema>
