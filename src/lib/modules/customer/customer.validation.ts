import { z } from 'zod'

export const createCustomerSchema = z.object({
  fullName: z.string().min(1),
  fatherName: z.string().optional(),
  cnic: z.string().optional(),
  phone: z.string().min(1),
  altPhone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  licenseNo: z.string().optional(),
  // date-only column — "YYYY-MM-DD", not a timestamp
  licenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  referenceName: z.string().optional(),
  referencePhone: z.string().optional(),
  customerType: z.enum(['individual', 'corporate']).default('individual'),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
