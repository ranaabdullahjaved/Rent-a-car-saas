import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { db } from '@/db/client'
import { vehicleMedia, vehicles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import * as fleetRepository from './fleet.repository'
import type { CreateVehicleInput, FleetFilters, UpdateVehicleInput } from './fleet.validation'

export async function listVehicles(tenantId: bigint, filters: FleetFilters) {
  return fleetRepository.listVehicles(tenantId, filters)
}

export async function getFleetSummary(tenantId: bigint) {
  const rows = await fleetRepository.countByStatus(tenantId)
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]))
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  return { total, byStatus }
}

export async function getVehicle(tenantId: bigint, id: bigint) {
  const row = await fleetRepository.findVehicleWithInvestor(tenantId, id)
  if (!row) throw new NotFoundError('Vehicle')
  return row
}

export async function listInvestorOptions(tenantId: bigint) {
  return fleetRepository.listInvestorOptions(tenantId)
}

/**
 * A duplicate registration is the single most likely data-entry mistake here,
 * and the generic "Duplicate record" from the unique constraint doesn't tell
 * the user what to fix.
 */
function rethrowDuplicate(err: unknown, registrationNo: string): never {
  const mapped = fromDbError(err)
  if (mapped.code === 'DUPLICATE') {
    throw new AppError(
      `A vehicle with registration ${registrationNo} already exists in your fleet.`,
      'DUPLICATE_REGISTRATION',
      409
    )
  }
  throw mapped
}

export type VehicleMediaEntry = { filePath: string; mediaType: string; mimeType: string }

/**
 * Creates a vehicle with its reference media in one transaction. Media is
 * compulsory on creation — the photos are what a customer is shown at booking
 * time, and a car nobody can see is a car nobody books.
 */
export async function createVehicle(
  tenantId: bigint,
  input: CreateVehicleInput,
  media: VehicleMediaEntry[]
) {
  if (media.length === 0) {
    throw new AppError(
      'Add at least one photo or a video of the vehicle before saving it.',
      'MEDIA_REQUIRED',
      422
    )
  }

  try {
    return await db.transaction(async (tx) => {
      const [vehicle] = await tx
        .insert(vehicles)
        .values({
          ...input,
          tenantId,
          primaryPhotoPath: media.find((m) => m.mediaType === 'photo')?.filePath ?? null,
        })
        .returning()
      if (!vehicle) throw new AppError('Could not save the vehicle', 'VEHICLE_FAILED', 500)

      for (const m of media) {
        await tx.insert(vehicleMedia).values({
          tenantId,
          vehicleId: vehicle.id,
          mediaType: m.mediaType,
          filePath: m.filePath,
          mimeType: m.mimeType,
        })
      }
      return vehicle
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    rethrowDuplicate(err, input.registrationNo)
  }
}

/** Adds more reference media to an existing vehicle (edits are additive). */
export async function addVehicleMedia(
  tenantId: bigint,
  vehicleId: bigint,
  media: VehicleMediaEntry[]
) {
  await getVehicle(tenantId, vehicleId)
  for (const m of media) {
    await db.insert(vehicleMedia).values({
      tenantId,
      vehicleId,
      mediaType: m.mediaType,
      filePath: m.filePath,
      mimeType: m.mimeType,
    })
  }
  // First photo becomes the thumbnail if the vehicle has none yet.
  const photo = media.find((m) => m.mediaType === 'photo')
  if (photo) {
    const row = await fleetRepository.findVehicleById(tenantId, vehicleId)
    if (row && !row.primaryPhotoPath) {
      await db
        .update(vehicles)
        .set({ primaryPhotoPath: photo.filePath, updatedAt: new Date() })
        .where(eq(vehicles.id, vehicleId))
    }
  }
}

export async function updateVehicle(tenantId: bigint, id: bigint, input: UpdateVehicleInput) {
  await getVehicle(tenantId, id)
  try {
    return await fleetRepository.updateVehicle(tenantId, id, input)
  } catch (err) {
    rethrowDuplicate(err, input.registrationNo)
  }
}

export async function retireVehicle(tenantId: bigint, id: bigint) {
  await getVehicle(tenantId, id)
  return fleetRepository.softDeleteVehicle(tenantId, id)
}
