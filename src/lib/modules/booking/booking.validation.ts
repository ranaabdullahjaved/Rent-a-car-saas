import { z } from 'zod'
import { optionalId, requiredId } from '@/lib/ids'

export const BOOKING_STATUSES = [
  'tentative',
  'confirmed',
  'dispatched',
  'active',
  'completed',
  'cancelled',
] as const

/**
 * The statuses the no_double_booking exclusion constraint actually covers.
 * A booking in any other status does NOT reserve the vehicle — see the
 * constraint predicate in migrations/README.md. Kept here so the UI can say
 * so plainly instead of implying every booking holds the car.
 */
export const BLOCKING_STATUSES = ['confirmed', 'dispatched', 'active'] as const

export const BOOKING_TYPES = ['self_drive', 'with_driver'] as const
export const BOOKING_SOURCES = ['direct', 'outsourced', 'online'] as const

export function blocksVehicle(status: string): boolean {
  return (BLOCKING_STATUSES as readonly string[]).includes(status)
}

const money = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v)))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')

const requiredMoney = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')

const optionalInt = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'Must be a whole number')

export const createBookingSchema = z
  .object({
    customerId: requiredId,
    vehicleId: optionalId,
    driverId: optionalId,
    bookingType: z.enum(BOOKING_TYPES).default('self_drive'),
    source: z.enum(BOOKING_SOURCES).default('direct'),
    status: z.enum(BOOKING_STATUSES).default('confirmed'),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    bufferMinutes: optionalInt.transform((v) => v ?? 0),
    dailyRate: requiredMoney,
    driverChargePerDay: money,
    allowedKmPerDay: optionalInt,
    extraKmRate: money,
    latePenaltyPerHour: money,
    lateGraceMinutes: optionalInt.transform((v) => v ?? 60),
    securityDeposit: money,
    discountAmount: money,
    notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
  })
  .refine((v) => v.endAt > v.startAt, {
    message: 'The return time must be after the pick-up time',
    path: ['endAt'],
  })
  // A self-drive booking has no driver; a chauffeur booking needs one to be
  // dispatched, but can be taken before the driver is assigned.
  .refine((v) => v.bookingType !== 'self_drive' || v.driverId === null, {
    message: 'A self-drive booking cannot have a driver assigned',
    path: ['driverId'],
  })
  // Outsourced bookings are fulfilled with someone else's car, so they carry
  // no vehicle. Everything else needs one to be confirmed.
  .refine((v) => v.source === 'outsourced' || !blocksVehicle(v.status) || v.vehicleId !== null, {
    message: 'Choose a vehicle before confirming this booking',
    path: ['vehicleId'],
  })

export const updateBookingSchema = createBookingSchema

export const bookingFilterSchema = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  view: z.enum(['all', 'today', 'departing', 'returning', 'overdue']).default('all'),
  sort: z.enum(['startAt', 'endAt', 'createdAt']).default('startAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
})

export const availabilitySchema = z
  .object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    bufferMinutes: optionalInt.transform((v) => v ?? 0),
    excludeBookingId: optionalId,
  })
  .refine((v) => v.endAt > v.startAt, { message: 'End must be after start', path: ['endAt'] })

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type BookingFilters = z.infer<typeof bookingFilterSchema>
export type AvailabilityQuery = z.infer<typeof availabilitySchema>

export const createBookingChargeSchema = z.object({
  chargeType: z.string().trim().min(1),
  description: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
  quantity: z.union([z.string(), z.number()]).default(1).transform((v) => String(v)),
  unitAmount: requiredMoney,
})

export type CreateBookingChargeInput = z.infer<typeof createBookingChargeSchema>
