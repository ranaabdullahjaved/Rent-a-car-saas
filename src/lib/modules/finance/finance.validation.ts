import { z } from 'zod'

const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal amount like "1200.00"')

export const createPaymentSchema = z.object({
  direction: z.enum(['in', 'out']),
  partyType: z.enum(['customer', 'investor', 'vendor', 'employee']),
  partyId: z.coerce.bigint().optional(),
  bookingId: z.coerce.bigint().optional(),
  amount: moneyString,
  method: z.enum(['cash', 'bank_transfer', 'card', 'easypaisa', 'jazzcash']).default('cash'),
  referenceNo: z.string().optional(),
  purpose: z.string().default('booking'),
})

export const createLedgerEntrySchema = z.object({
  // date-only column — "YYYY-MM-DD", not a timestamp
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  direction: z.enum(['income', 'expense']),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  amount: moneyString,
  vehicleId: z.coerce.bigint().optional(),
  bookingId: z.coerce.bigint().optional(),
  investorId: z.coerce.bigint().optional(),
  vendorId: z.coerce.bigint().optional(),
  customerId: z.coerce.bigint().optional(),
  employeeId: z.coerce.bigint().optional(),
  sourceType: z.string().min(1),
  sourceId: z.coerce.bigint(),
  description: z.string().optional(),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>
