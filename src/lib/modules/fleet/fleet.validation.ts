import { z } from 'zod'

export const createVehicleSchema = z.object({
  registrationNo: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().optional(),
  modelYear: z.coerce.number().int().optional(),
  colour: z.string().optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  fuelType: z.enum(['petrol', 'diesel', 'cng', 'hybrid', 'electric']).optional(),
  ownershipType: z.enum(['company', 'investor', 'leased']).default('company'),
  investorId: z.coerce.bigint().optional(),
})

export const updateVehicleSchema = createVehicleSchema.partial()

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
