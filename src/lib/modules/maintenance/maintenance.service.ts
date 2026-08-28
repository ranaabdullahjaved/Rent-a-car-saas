import { and, asc, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { maintenanceRecords, maintenanceSchedules, vehicleHandovers, vehicles } from '@/db/schema'
import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { ZERO, addMoney, money, type Money } from '@/lib/money'
import { postLedgerEntry } from '../finance/ledger.service'
import { averageDailyKm, predictService, type Prediction } from './maintenance.prediction'
import type { CreateScheduleInput, RecordJobInput } from './maintenance.validation'

const DAY_MS = 86_400_000

/**
 * The vehicle's observed pace, from handover odometer readings over the last
 * 90 days. Handovers are where odometers are actually read, so this is real
 * usage rather than an assumption.
 */
async function paceFor(tenantId: bigint, vehicleId: bigint): Promise<number | null> {
  const since = new Date(Date.now() - 90 * DAY_MS)
  const readings = await db
    .select({ odometer: vehicleHandovers.odometer, at: vehicleHandovers.performedAt })
    .from(vehicleHandovers)
    .where(
      and(
        eq(vehicleHandovers.tenantId, tenantId),
        eq(vehicleHandovers.vehicleId, vehicleId),
        gte(vehicleHandovers.performedAt, since)
      )
    )
    .orderBy(asc(vehicleHandovers.performedAt))

  if (readings.length < 2) return null
  return averageDailyKm(readings[0]!, readings.at(-1)!)
}

export async function createSchedule(tenantId: bigint, input: CreateScheduleInput) {
  const [vehicle] = await db
    .select({ id: vehicles.id, currentOdometer: vehicles.currentOdometer })
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.id, input.vehicleId), isNull(vehicles.deletedAt)))
    .limit(1)
  if (!vehicle) throw new NotFoundError('Vehicle')

  try {
    // The baseline is "as of now": the car's current odometer and today.
    // The first service then falls one full interval out.
    const [row] = await db
      .insert(maintenanceSchedules)
      .values({
        tenantId,
        vehicleId: input.vehicleId,
        serviceType: input.serviceType,
        intervalKm: input.intervalKm,
        intervalDays: input.intervalDays,
        alertBeforeKm: input.alertBeforeKm,
        alertBeforeDays: input.alertBeforeDays,
        lastServiceKm: input.intervalKm !== null ? vehicle.currentOdometer : null,
        lastServiceAt: input.intervalDays !== null ? new Date().toISOString().slice(0, 10) : null,
      })
      .returning()
    return row
  } catch (err) {
    throw fromDbError(err)
  }
}

/**
 * Records a completed job. The record, the schedule reset, the vehicle's
 * odometer and the ledger expense move in one transaction — a job that is
 * paid for but never reaches the ledger makes every profit figure too high.
 */
export async function recordJob(tenantId: bigint, input: RecordJobInput) {
  const [vehicle] = await db
    .select({ id: vehicles.id, currentOdometer: vehicles.currentOdometer })
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.id, input.vehicleId), isNull(vehicles.deletedAt)))
    .limit(1)
  if (!vehicle) throw new NotFoundError('Vehicle')

  const total: Money = [input.labourCost, input.partsCost, input.otherCost]
    .map((v) => money(v))
    .reduce(addMoney, ZERO)

  try {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .insert(maintenanceRecords)
        .values({
          tenantId,
          vehicleId: input.vehicleId,
          scheduleId: input.scheduleId,
          serviceType: input.serviceType,
          maintenanceKind: input.maintenanceKind,
          workshopName: input.workshopName,
          odometer: input.odometer,
          performedAt: input.performedAt,
          labourCost: money(input.labourCost),
          partsCost: money(input.partsCost),
          otherCost: money(input.otherCost),
          notes: input.notes,
        })
        .returning()

      if (!record) throw new AppError('Could not record the job', 'JOB_FAILED', 500)

      // Reset the schedule this job satisfies, so the next due rolls forward.
      if (input.scheduleId) {
        await tx
          .update(maintenanceSchedules)
          .set({
            lastServiceKm: input.odometer,
            lastServiceAt: input.performedAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(maintenanceSchedules.tenantId, tenantId),
              eq(maintenanceSchedules.id, input.scheduleId)
            )
          )
      }

      // A workshop reads the odometer; keep the vehicle's current.
      if (input.odometer !== null && input.odometer > vehicle.currentOdometer) {
        await tx
          .update(vehicles)
          .set({ currentOdometer: input.odometer, updatedAt: new Date() })
          .where(eq(vehicles.id, input.vehicleId))
      }

      if (Number(total) > 0) {
        await postLedgerEntry(tx, tenantId, {
          entryDate: input.performedAt,
          category: 'maintenance',
          subcategory: input.serviceType,
          amount: total,
          sourceType: 'maintenance',
          sourceId: record.id,
          vehicleId: input.vehicleId,
          description: input.workshopName
            ? `${input.serviceType} · ${input.workshopName}`
            : input.serviceType,
        })
      }

      return record
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw fromDbError(err)
  }
}

export type VehicleMaintenance = {
  vehicleId: bigint
  registrationNo: string
  make: string
  model: string
  status: string
  currentOdometer: number
  avgKmPerDay: number | null
  schedules: {
    id: bigint
    serviceType: string
    intervalKm: number | null
    intervalDays: number | null
    prediction: Prediction
  }[]
}

/** Every vehicle with its schedules and where each one stands. */
export async function getFleetMaintenance(tenantId: bigint): Promise<VehicleMaintenance[]> {
  const [fleet, schedules] = await Promise.all([
    db
      .select({
        id: vehicles.id,
        registrationNo: vehicles.registrationNo,
        make: vehicles.make,
        model: vehicles.model,
        status: vehicles.status,
        currentOdometer: vehicles.currentOdometer,
      })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .orderBy(asc(vehicles.registrationNo)),
    db
      .select()
      .from(maintenanceSchedules)
      .where(and(eq(maintenanceSchedules.tenantId, tenantId), eq(maintenanceSchedules.isActive, true))),
  ])

  const out: VehicleMaintenance[] = []
  for (const v of fleet) {
    const mine = schedules.filter((s) => String(s.vehicleId) === String(v.id))
    const pace = mine.length ? await paceFor(tenantId, v.id) : null
    out.push({
      vehicleId: v.id,
      registrationNo: v.registrationNo,
      make: v.make,
      model: v.model,
      status: v.status,
      currentOdometer: v.currentOdometer,
      avgKmPerDay: pace,
      schedules: mine.map((s) => ({
        id: s.id,
        serviceType: s.serviceType,
        intervalKm: s.intervalKm,
        intervalDays: s.intervalDays,
        prediction: predictService(s, v.currentOdometer, pace),
      })),
    })
  }
  return out
}

export async function listRecentJobs(tenantId: bigint, limit = 30) {
  return db
    .select({
      id: maintenanceRecords.id,
      vehicleId: maintenanceRecords.vehicleId,
      serviceType: maintenanceRecords.serviceType,
      maintenanceKind: maintenanceRecords.maintenanceKind,
      workshopName: maintenanceRecords.workshopName,
      odometer: maintenanceRecords.odometer,
      performedAt: maintenanceRecords.performedAt,
      labourCost: maintenanceRecords.labourCost,
      partsCost: maintenanceRecords.partsCost,
      otherCost: maintenanceRecords.otherCost,
      registrationNo: vehicles.registrationNo,
      total: sql<string>`(${maintenanceRecords.labourCost} + ${maintenanceRecords.partsCost} + ${maintenanceRecords.otherCost})::text`,
    })
    .from(maintenanceRecords)
    .innerJoin(vehicles, eq(vehicles.id, maintenanceRecords.vehicleId))
    .where(and(eq(maintenanceRecords.tenantId, tenantId), isNull(maintenanceRecords.deletedAt)))
    .orderBy(desc(maintenanceRecords.performedAt))
    .limit(limit)
}
