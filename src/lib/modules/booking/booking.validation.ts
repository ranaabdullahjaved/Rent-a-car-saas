import { z } from 'zod'

const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal amount like "1200.00"')

export const createBookingSchema = z.object({
  customerId: z.coerce.bigint(),
  vehicleId: z.coerce.bigint().optional(),
  driverId: z.coerce.bigint().optional(),
  bookingType: z.enum(['self_drive', 'with_driver']).default('self_drive'),
  source: z.enum(['direct', 'outsourced', 'online']).default('direct'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  bufferMinutes: z.coerce.number().int().min(0).default(0),
  dailyRate: moneyString,
  driverChargePerDay: moneyString.default('0.00'),
  allowedKmPerDay: z.coerce.number().int().positive().optional(),
  extraKmRate: moneyString.default('0.00'),
  securityDeposit: moneyString.default('0.00'),
  notes: z.string().optional(),
})

export const updateBookingSchema = createBookingSchema.partial()

export const createBookingChargeSchema = z.object({
  bookingId: z.coerce.bigint(),
  chargeType: z.string().min(1),
  description: z.string().optional(),
  quantity: z.coerce.number().positive().default(1),
  unitAmount: moneyString,
  amount: moneyString,
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type CreateBookingChargeInput = z.infer<typeof createBookingChargeSchema>
