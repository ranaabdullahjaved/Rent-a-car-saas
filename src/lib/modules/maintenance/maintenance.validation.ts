import { z } from 'zod'
import { optionalId, requiredId } from '@/lib/ids'

export const SERVICE_TYPES = [
  'oil_change',
  'tyres',
  'brakes',
  'tuning',
  'battery',
  'ac_service',
  'general_service',
  'repair',
  'other',
] as const

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: 'Oil change',
  tyres: 'Tyres',
  brakes: 'Brakes',
  tuning: 'Tuning',
  battery: 'Battery',
  ac_service: 'AC service',
  general_service: 'General service',
  repair: 'Repair',
  other: 'Other',
}

const optionalMoney = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? '0' : String(v).trim()))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 4500 or 4500.50')

const optionalInt = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'Must be a whole number')

const isoDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date')

export const createScheduleSchema = z
  .object({
    vehicleId: requiredId,
    serviceType: z.enum(SERVICE_TYPES),
    intervalKm: optionalInt.refine((v) => v === null || v >= 100, 'An interval under 100 km is a typo'),
    intervalDays: optionalInt.refine((v) => v === null || v >= 7, 'An interval under a week is a typo'),
    alertBeforeKm: optionalInt.transform((v) => v ?? 500),
    alertBeforeDays: optionalInt.transform((v) => v ?? 7),
  })
  // A schedule with neither interval can never come due.
  .refine((v) => v.intervalKm !== null || v.intervalDays !== null, {
    message: 'Set a distance interval, a time interval, or both',
    path: ['intervalKm'],
  })

export const recordJobSchema = z.object({
  vehicleId: requiredId,
  scheduleId: optionalId,
  serviceType: z.enum(SERVICE_TYPES),
  maintenanceKind: z.enum(['scheduled', 'unscheduled', 'repair']).default('scheduled'),
  workshopName: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
  odometer: optionalInt,
  performedAt: isoDate,
  labourCost: optionalMoney,
  partsCost: optionalMoney,
  otherCost: optionalMoney,
  notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
})

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>
export type RecordJobInput = z.infer<typeof recordJobSchema>
