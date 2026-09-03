import { z } from 'zod'
import { requiredId } from '@/lib/ids'
import { ZERO, addMoney, money, multiplyMoney, type Money } from '@/lib/money'

/**
 * The angles that must be photographed before a car leaves.
 *
 * Fixed rather than free-form because the brief's whole point is that a damage
 * claim cannot be argued away by a missing picture — "before sending the car I
 * will make videos and take photos of the car including it odometer". A set
 * that varies per agent is a set that has gaps.
 */
export const REQUIRED_ANGLES = [
  'front_left',
  'front_right',
  'rear_left',
  'rear_right',
  'left_side',
  'right_side',
  'interior',
  'odometer',
] as const

export const OPTIONAL_ANGLES = ['walkaround_video', 'fuel_gauge', 'damage_detail', 'other'] as const

export const ANGLE_LABELS: Record<string, string> = {
  front_left: 'Front left corner',
  front_right: 'Front right corner',
  rear_left: 'Rear left corner',
  rear_right: 'Rear right corner',
  left_side: 'Left side',
  right_side: 'Right side',
  interior: 'Interior',
  odometer: 'Odometer',
  walkaround_video: 'Walkaround video',
  fuel_gauge: 'Fuel gauge',
  damage_detail: 'Damage close-up',
  other: 'Other',
}

export const ALL_ANGLES = [...REQUIRED_ANGLES, ...OPTIONAL_ANGLES] as const
export const HANDOVER_TYPES = ['checkout', 'checkin'] as const

/** Fuel is read off the gauge in eighths, which is how people actually read it. */
export const FUEL_EIGHTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

export function fuelLabel(eighths: number | null): string {
  if (eighths === null || eighths === undefined) return 'not recorded'
  const names: Record<number, string> = {
    0: 'Empty', 2: '¼', 4: '½', 6: '¾', 8: 'Full',
  }
  return names[eighths] ?? `${eighths}/8`
}

const odometer = z
  .union([z.string(), z.number()])
  .transform((v) => Number(String(v).trim()))
  .refine((v) => Number.isInteger(v) && v >= 0, 'Enter the odometer reading in kilometres')

const fuelEighths = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 8), 'Fuel must be 0 to 8 eighths')

const optionalText = z
  .string()
  .trim()
  .max(400)
  .optional()
  .transform((v) => (v ? v : null))

export const recordHandoverSchema = z.object({
  bookingId: requiredId,
  handoverType: z.enum(HANDOVER_TYPES),
  odometer,
  fuelLevelEighths: fuelEighths,
  exteriorCondition: optionalText,
  interiorCondition: optionalText,
  location: optionalText,
  notes: optionalText,
  // Angles captured so far, sent by the client so the server can enforce the
  // required set rather than trusting the form to have done it.
  capturedAngles: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : [])),
})

export const uploadRequestSchema = z.object({
  bookingId: requiredId,
  angle: z.enum(ALL_ANGLES),
  fileName: z.string().trim().min(1).max(200),
  contentType: z
    .string()
    .trim()
    .refine((v) => /^(image|video)\//.test(v), 'Only images and video can be attached'),
})

export type RecordHandoverInput = z.infer<typeof recordHandoverSchema>
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>

/**
 * Which required angles are still missing. A walkaround video covers the car
 * from every side in one take, so capturing one stands in for all eight
 * photos — they become optional extras.
 */
export function missingAngles(captured: string[]): string[] {
  const seen = new Set(captured)
  if (seen.has('walkaround_video')) return []
  return REQUIRED_ANGLES.filter((a) => !seen.has(a))
}

export type CheckinAssessment = {
  kilometresDriven: number
  extraKilometres: number
  extraKmCharge: Money
  fuelShortfallEighths: number
  fuelCharge: Money
  hoursLate: number
  lateCharge: Money
  total: Money
}

/**
 * Works out what a return actually cost, from the two handovers and the
 * booking's own terms.
 *
 * Everything here is a PROPOSAL. The brief is explicit that the operator
 * decides — "if there is low fuel as compared to when i send the car I ask for
 * compensation" — so these figures are shown to an agent to confirm or waive,
 * never charged silently.
 */
export function assessReturn(input: {
  odometerOut: number
  odometerIn: number
  fuelOutEighths: number | null
  fuelInEighths: number | null
  scheduledEnd: Date
  actualEnd: Date
  allowedKmPerDay: number | null
  chargeableDays: number
  extraKmRate: string
  tankCapacityLitres: string | null
  fuelRatePerLitre: string
  latePenaltyPerHour: string
  lateGraceMinutes: number
}): CheckinAssessment {
  const kilometresDriven = Math.max(0, input.odometerIn - input.odometerOut)

  const allowance = input.allowedKmPerDay ? input.allowedKmPerDay * input.chargeableDays : null
  const extraKilometres = allowance === null ? 0 : Math.max(0, kilometresDriven - allowance)
  const extraKmCharge = multiplyMoney(money(input.extraKmRate || '0'), extraKilometres)

  // Fuel is compared as it was read: in eighths of a tank.
  const fuelShortfallEighths =
    input.fuelOutEighths === null || input.fuelInEighths === null
      ? 0
      : Math.max(0, input.fuelOutEighths - input.fuelInEighths)

  const litresShort =
    input.tankCapacityLitres && fuelShortfallEighths > 0
      ? (Number(input.tankCapacityLitres) * fuelShortfallEighths) / 8
      : 0
  const fuelCharge =
    litresShort > 0 ? multiplyMoney(money(input.fuelRatePerLitre || '0'), litresShort.toFixed(2)) : ZERO

  const lateMs = input.actualEnd.getTime() - input.scheduledEnd.getTime()
  const lateMinutes = Math.max(0, Math.floor(lateMs / 60_000))
  const chargeableLateMinutes = Math.max(0, lateMinutes - input.lateGraceMinutes)
  // Part of an hour late is an hour — the car was unavailable for it either way.
  const hoursLate = Math.ceil(chargeableLateMinutes / 60)
  const lateCharge = multiplyMoney(money(input.latePenaltyPerHour || '0'), hoursLate)

  const total = [extraKmCharge, fuelCharge, lateCharge].reduce<Money>(addMoney, ZERO)

  return {
    kilometresDriven,
    extraKilometres,
    extraKmCharge,
    fuelShortfallEighths,
    fuelCharge,
    hoursLate,
    lateCharge,
    total,
  }
}
