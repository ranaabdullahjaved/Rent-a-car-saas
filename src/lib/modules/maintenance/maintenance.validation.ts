import { z } from 'zod'

const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal amount like "1200.00"')

export const createMaintenanceRecordSchema = z.object({
  vehicleId: z.coerce.bigint(),
  scheduleId: z.coerce.bigint().optional(),
  serviceType: z.string().min(1),
  maintenanceKind: z.enum(['scheduled', 'unscheduled', 'repair']).default('scheduled'),
  workshopName: z.string().optional(),
  odometer: z.coerce.number().int().optional(),
  // date-only column — "YYYY-MM-DD", not a timestamp
  performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  labourCost: moneyString.default('0.00'),
  partsCost: moneyString.default('0.00'),
  otherCost: moneyString.default('0.00'),
  bornBy: z.enum(['company', 'investor']).default('company'),
  notes: z.string().optional(),
})

export const createFuelLogSchema = z.object({
  vehicleId: z.coerce.bigint(),
  bookingId: z.coerce.bigint().optional(),
  litres: z.coerce.number().positive(),
  ratePerLitre: z.coerce.number().positive(),
  amount: moneyString,
  odometer: z.coerce.number().int().optional(),
  stationName: z.string().optional(),
})

export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordSchema>
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>
