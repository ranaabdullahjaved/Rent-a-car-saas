import { z } from 'zod'
import { optionalId, requiredId } from '@/lib/ids'
import { addMoney, money, subtractMoney, type Money } from '@/lib/money'

export const DAMAGE_SEVERITIES = ['minor', 'moderate', 'major', 'total_loss'] as const
export const DAMAGE_FAULT = ['customer', 'third_party', 'company', 'unknown'] as const
export const DAMAGE_STATUSES = ['open', 'repairing', 'repaired', 'written_off'] as const

export const CHALLAN_LIABILITY = ['customer', 'driver', 'company'] as const
export const CHALLAN_STATUSES = ['pending', 'paid', 'contested', 'waived'] as const

const optionalMoney = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v).trim()))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')

const requiredMoney = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')
  .refine((v) => Number(v) > 0, 'The amount must be more than zero')

export const recordDamageSchema = z
  .object({
    vehicleId: requiredId,
    bookingId: optionalId,
    severity: z.enum(DAMAGE_SEVERITIES).default('minor'),
    atFault: z.enum(DAMAGE_FAULT).default('unknown'),
    description: z.string().trim().min(3, 'Describe what happened').max(1000),
    location: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
    incidentAt: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? new Date(v) : new Date()))
      .refine((d) => !Number.isNaN(d.getTime()), 'That is not a valid date'),
    policeReportNo: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
    estimatedCost: optionalMoney,
    actualRepairCost: optionalMoney,
    // What the operator decided to bill the customer. Deliberately independent
    // of the repair cost — the brief's example is a 30,000 repair charged out
    // at 50,000, and the 20,000 difference is the operator's margin, not an
    // error to be corrected.
    amountChargedToCustomer: optionalMoney,
    downtimeDays: z
      .union([z.string(), z.number()])
      .nullish()
      .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v)))
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter a number of days'),
    status: z.enum(DAMAGE_STATUSES).default('open'),
    notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
  })
  // Charging a customer for damage on no booking leaves nobody to bill.
  .refine((v) => Number(v.amountChargedToCustomer) === 0 || v.bookingId !== null, {
    message: 'Link this damage to a booking before charging the customer for it',
    path: ['bookingId'],
  })

export const recordChallanSchema = z
  .object({
    vehicleId: requiredId,
    bookingId: optionalId,
    challanNo: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
    violationType: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
    violationAt: z
      .string()
      .trim()
      .refine((v) => Boolean(v), 'When did the violation happen?')
      .transform((v) => new Date(v))
      .refine((d) => !Number.isNaN(d.getTime()), 'That is not a valid date'),
    location: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
    amount: requiredMoney,
    lateSurcharge: optionalMoney,
    liability: z.enum(CHALLAN_LIABILITY).default('customer'),
    status: z.enum(CHALLAN_STATUSES).default('pending'),
    notes: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
  })
  .refine((v) => v.liability !== 'customer' || v.bookingId !== null, {
    message: 'Link the challan to the booking that was running at the time',
    path: ['bookingId'],
  })

export type RecordDamageInput = z.infer<typeof recordDamageSchema>
export type RecordChallanInput = z.infer<typeof recordChallanSchema>

/**
 * What a damage incident did to the business.
 *
 * Positive means the operator came out ahead — the case from the brief where a
 * 30,000 repair is charged out at 50,000. Negative means they absorbed part of
 * it, which happens when a customer cannot pay. Both are real and the number
 * must be allowed to go either way.
 */
export function damageNetImpact(actualRepairCost: string, amountChargedToCustomer: string): Money {
  return subtractMoney(money(amountChargedToCustomer), money(actualRepairCost))
}

/** Total payable on a challan, including any late surcharge. */
export function challanTotal(amount: string, lateSurcharge: string): Money {
  return addMoney(money(amount), money(lateSurcharge))
}
