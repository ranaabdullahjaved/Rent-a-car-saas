import { z } from 'zod'

export const createInvestorSchema = z.object({
  name: z.string().min(1),
  cnic: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountTitle: z.string().optional(),
  bankAccountNo: z.string().optional(),
  iban: z.string().optional(),
  settlementCycle: z.enum(['weekly', 'monthly', 'quarterly']).default('monthly'),
})

export const updateInvestorSchema = createInvestorSchema.partial()

export type CreateInvestorInput = z.infer<typeof createInvestorSchema>
export type UpdateInvestorInput = z.infer<typeof updateInvestorSchema>
