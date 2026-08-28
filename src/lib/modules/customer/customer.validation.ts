import { z } from 'zod'

export const CUSTOMER_TYPES = ['individual', 'corporate'] as const
export const RISK_RATINGS = ['normal', 'watch', 'blacklisted'] as const

/**
 * A Pakistani CNIC is 13 digits, written as 12345-1234567-1 about as often as
 * it is written unbroken. Store the digits only so the unique constraint and
 * lookups behave; format for display.
 */
export function normaliseCnic(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCnic(digits: string | null): string | null {
  if (!digits || digits.length !== 13) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
}

/**
 * Phone numbers arrive as 0300-1234567, +92 300 1234567 and 923001234567 for
 * the same person. Reduce to national significant digits so duplicate
 * detection and search treat those as one number.
 */
export function normalisePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('92')) return digits.slice(2)
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))

const cnicField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normaliseCnic(v) : null))
  .refine((v) => v === null || v.length === 13, 'A CNIC must be 13 digits')

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is too short').max(120),
  fatherName: optionalText,
  cnic: cnicField,
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short')
    .max(30)
    .refine((v) => normalisePhone(v).length >= 9, 'That does not look like a valid phone number'),
  altPhone: optionalText,
  whatsapp: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, 'Enter a valid email'),
  address: z.string().trim().max(400).optional().transform((v) => (v ? v : null)),
  city: optionalText,
  licenseNo: optionalText,
  licenseExpiry: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    // Drizzle types a Postgres `date` column as a string, so this must stay a
    // string rather than becoming a Date.
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use the date picker'),
  referenceName: optionalText,
  referencePhone: optionalText,
  customerType: z.enum(CUSTOMER_TYPES).default('individual'),
  riskRating: z.enum(RISK_RATINGS).default('normal'),
  blacklistReason: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
  notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
})
  // Blacklisting without a reason is how a customer ends up permanently
  // blocked with nobody able to say why.
  .refine((v) => v.riskRating !== 'blacklisted' || Boolean(v.blacklistReason), {
    message: 'Give a reason when blacklisting a customer',
    path: ['blacklistReason'],
  })

export const updateCustomerSchema = createCustomerSchema

export const customerFilterSchema = z.object({
  q: z.string().trim().max(60).optional(),
  riskRating: z.enum(RISK_RATINGS).optional(),
  customerType: z.enum(CUSTOMER_TYPES).optional(),
  sort: z.enum(['fullName', 'createdAt', 'totalBookings']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerFilters = z.infer<typeof customerFilterSchema>

/** True when the licence has an expiry date that is in the past. */
export function isLicenceExpired(licenseExpiry: string | null, today = new Date()): boolean {
  if (!licenseExpiry) return false
  return licenseExpiry < today.toISOString().slice(0, 10)
}
