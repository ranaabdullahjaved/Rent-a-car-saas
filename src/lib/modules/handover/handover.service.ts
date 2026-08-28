import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookings, handoverMedia, vehicleHandovers, vehicles } from '@/db/schema'
import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { chargeableDays } from '../booking/booking.quote'
import { assessReturn, missingAngles, type RecordHandoverInput } from './handover.validation'

async function loadBookingForHandover(tenantId: bigint, bookingId: bigint) {
  const [row] = await db
    .select({
      booking: bookings,
      tankCapacityLitres: vehicles.tankCapacityLitres,
      registrationNo: vehicles.registrationNo,
    })
    .from(bookings)
    .leftJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
    .limit(1)
  if (!row) throw new NotFoundError('Booking')
  return row
}

export async function listHandovers(tenantId: bigint, bookingId: bigint) {
  const rows = await db
    .select()
    .from(vehicleHandovers)
    .where(and(eq(vehicleHandovers.tenantId, tenantId), eq(vehicleHandovers.bookingId, bookingId)))
    .orderBy(asc(vehicleHandovers.performedAt))

  const media = rows.length
    ? await db
        .select()
        .from(handoverMedia)
        .where(eq(handoverMedia.tenantId, tenantId))
        .orderBy(asc(handoverMedia.id))
    : []

  return rows.map((h) => ({
    ...h,
    media: media.filter((m) => String(m.handoverId) === String(h.id)),
  }))
}

/**
 * Records a check-out or check-in.
 *
 * The handover, the booking's state and the vehicle's state move together in
 * one transaction. A car marked on-rent with no handover recorded — or a
 * handover with the car still showing available — is the kind of inconsistency
 * that makes an availability screen untrustworthy.
 */
export async function recordHandover(tenantId: bigint, input: RecordHandoverInput) {
  const { booking: b } = await loadBookingForHandover(tenantId, input.bookingId)

  if (!b.vehicleId) {
    throw new AppError('Assign a vehicle to this booking before handing it over.', 'VEHICLE_REQUIRED', 422)
  }

  const existing = await listHandovers(tenantId, input.bookingId)
  const alreadyOut = existing.some((h) => h.handoverType === 'checkout')
  const alreadyIn = existing.some((h) => h.handoverType === 'checkin')

  if (input.handoverType === 'checkout' && alreadyOut) {
    throw new AppError('This booking has already been checked out.', 'ALREADY_CHECKED_OUT', 409)
  }
  if (input.handoverType === 'checkin') {
    if (!alreadyOut) {
      throw new AppError('Check the vehicle out before checking it back in.', 'NOT_CHECKED_OUT', 409)
    }
    if (alreadyIn) {
      throw new AppError('This booking has already been checked in.', 'ALREADY_CHECKED_IN', 409)
    }
  }

  // Enforced on the server, not just in the form — the required set is the
  // whole point, and a client can always be bypassed.
  const missing = missingAngles(input.capturedAngles)
  if (missing.length > 0) {
    throw new AppError(
      `Photograph every required angle first. Still missing: ${missing.join(', ')}.`,
      'MISSING_ANGLES',
      422
    )
  }

  // An odometer that went backwards is a typo or the wrong car.
  const lastReading = existing.at(-1)?.odometer ?? 0
  if (input.odometer < lastReading) {
    throw new AppError(
      `The odometer cannot go backwards — the last reading was ${lastReading} km.`,
      'ODOMETER_REGRESSION',
      422
    )
  }

  try {
    return await db.transaction(async (tx) => {
      const now = new Date()

      const [handover] = await tx
        .insert(vehicleHandovers)
        .values({
          tenantId,
          bookingId: input.bookingId,
          vehicleId: b.vehicleId!,
          handoverType: input.handoverType,
          performedAt: now,
          odometer: input.odometer,
          fuelLevelEighths: input.fuelLevelEighths,
          exteriorCondition: input.exteriorCondition,
          interiorCondition: input.interiorCondition,
          location: input.location,
          notes: input.notes,
        })
        .returning()

      if (input.handoverType === 'checkout') {
        await tx
          .update(bookings)
          .set({ actualStartAt: now, status: 'active', updatedAt: now })
          .where(eq(bookings.id, input.bookingId))
        await tx
          .update(vehicles)
          .set({ status: 'on_rent', currentOdometer: input.odometer, updatedAt: now })
          .where(eq(vehicles.id, b.vehicleId!))
      } else {
        await tx
          .update(bookings)
          .set({ actualEndAt: now, status: 'completed', updatedAt: now })
          .where(eq(bookings.id, input.bookingId))
        await tx
          .update(vehicles)
          .set({ status: 'available', currentOdometer: input.odometer, updatedAt: now })
          .where(eq(vehicles.id, b.vehicleId!))
      }

      return handover
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw fromDbError(err)
  }
}

/** Links an uploaded file to a handover once the browser has finished with R2. */
export async function attachMedia(
  tenantId: bigint,
  handoverId: bigint,
  input: { angle: string; filePath: string; mediaType: string; mimeType: string; sizeBytes?: number }
) {
  const [row] = await db
    .insert(handoverMedia)
    .values({
      tenantId,
      handoverId,
      angle: input.angle,
      filePath: input.filePath,
      mediaType: input.mediaType,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes ? BigInt(input.sizeBytes) : null,
    })
    .returning()
  return row
}

/**
 * What the return is going to cost, proposed from the two handovers.
 * Returns null until both have happened.
 */
export async function getReturnAssessment(
  tenantId: bigint,
  bookingId: bigint,
  fuelRatePerLitre = '280'
) {
  const { booking: b, tankCapacityLitres } = await loadBookingForHandover(tenantId, bookingId)
  const handovers = await listHandovers(tenantId, bookingId)

  const out = handovers.find((h) => h.handoverType === 'checkout')
  const back = handovers.find((h) => h.handoverType === 'checkin')
  if (!out || !back) return null

  return assessReturn({
    odometerOut: out.odometer,
    odometerIn: back.odometer,
    fuelOutEighths: out.fuelLevelEighths,
    fuelInEighths: back.fuelLevelEighths,
    scheduledEnd: b.endAt,
    actualEnd: back.performedAt,
    allowedKmPerDay: b.allowedKmPerDay,
    chargeableDays: chargeableDays(b.startAt, b.endAt),
    extraKmRate: b.extraKmRate,
    tankCapacityLitres,
    fuelRatePerLitre,
    latePenaltyPerHour: b.latePenaltyPerHour,
    lateGraceMinutes: b.lateGraceMinutes,
  })
}
