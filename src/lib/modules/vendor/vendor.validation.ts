import { z } from 'zod'
import { requiredId } from '@/lib/ids'

export const VENDOR_TYPES = ['supplier', 'customer', 'both', 'workshop'] as const

/**
 * Which way a car moved on an outsourced job.
 *
 * inbound  — we took a booking we could not fulfil and sourced the car from
 *            another operator. Their fee is our cost.
 * outbound — another operator rented one of our cars. Their fee is our income.
 */
export const OUTSOURCE_DIRECTIONS = ['inbound', 'outbound'] as const

const requiredMoney = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')
  .refine((v) => Number(v) > 0, 'The amount must be more than zero')

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))

export const createVendorSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120),
  companyName: optionalText,
  phone: z.string().trim().min(7, 'Phone number is too short').max(30),
  altPhone: optionalText,
  city: optionalText,
  address: z.string().trim().max(400).optional().transform((v) => (v ? v : null)),
  vendorType: z.enum(VENDOR_TYPES).default('both'),
  trustRating: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), 'Rate from 1 to 5'),
  creditLimit: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v)))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 50000'),
  notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
})

/** Attaches an outsourced job's counterparty and fee to an existing booking. */
export const setOutsourcingSchema = z.object({
  bookingId: requiredId,
  vendorId: requiredId,
  outsourceDirection: z.enum(OUTSOURCE_DIRECTIONS),
  vendorAmount: requiredMoney,
})

export type CreateVendorInput = z.infer<typeof createVendorSchema>
export type SetOutsourcingInput = z.infer<typeof setOutsourcingSchema>
