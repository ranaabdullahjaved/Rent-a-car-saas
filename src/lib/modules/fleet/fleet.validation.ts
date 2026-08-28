import { z } from 'zod'

export const VEHICLE_STATUSES = [
  'available',
  'on_rent',
  'maintenance',
  'damaged',
  'sold',
  'inactive',
] as const

export const OWNERSHIP_TYPES = ['company', 'investor', 'leased'] as const
export const TRANSMISSIONS = ['manual', 'automatic'] as const
export const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'hybrid', 'electric'] as const

/** Blank optional inputs arrive as '' from a form; store them as null. */
const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))

const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'Must be a whole number')

export const createVehicleSchema = z.object({
  // Registration numbers are written inconsistently (LEA 01 1234, lea-01-1234).
  // Store one canonical uppercase, single-dash form so lookups and the unique
  // constraint behave.
  registrationNo: z
    .string()
    .trim()
    .min(3, 'Registration number is too short')
    .max(24)
    .transform((v) => v.toUpperCase().replace(/[\s-]+/g, '-')),
  make: z.string().trim().min(1, 'Make is required').max(60),
  model: z.string().trim().min(1, 'Model is required').max(60),
  variant: optionalText,
  modelYear: optionalInt.refine(
    (v) => v === null || (v >= 1950 && v <= 2100),
    'Enter a realistic model year'
  ),
  colour: optionalText,
  chassisNo: optionalText,
  engineNo: optionalText,
  transmission: z.enum(TRANSMISSIONS).optional().nullable(),
  fuelType: z.enum(FUEL_TYPES).optional().nullable(),
  engineCc: optionalInt,
  seatingCapacity: optionalInt,
  ownershipType: z.enum(OWNERSHIP_TYPES).default('company'),
  investorId: z
    .union([z.string(), z.number(), z.bigint()])
    .optional()
    .transform((v) => (v === '' || v === undefined || v === null ? null : BigInt(v))),
  currentOdometer: optionalInt.transform((v) => v ?? 0),
  status: z.enum(VEHICLE_STATUSES).default('available'),
  notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
})
  // An investor-owned car with no investor is the mistake that quietly breaks
  // every payout calculation later, so reject it at the edge.
  .refine((v) => v.ownershipType !== 'investor' || v.investorId !== null, {
    message: 'Choose the investor who owns this vehicle',
    path: ['investorId'],
  })

export const updateVehicleSchema = createVehicleSchema

/** Filters for the fleet list. Every value round-trips through the URL. */
export const fleetFilterSchema = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(VEHICLE_STATUSES).optional(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  sort: z.enum(['registrationNo', 'modelYear', 'currentOdometer', 'createdAt']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
export type FleetFilters = z.infer<typeof fleetFilterSchema>

/**
 * Registration numbers are searched with the separators people actually type
 * stripped out, so "lea011234" finds "LEA-01-1234".
 */
export function normaliseRegistrationSearch(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, '')
}
