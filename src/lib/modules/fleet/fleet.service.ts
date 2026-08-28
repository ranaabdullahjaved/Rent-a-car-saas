import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
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

export async function createVehicle(tenantId: bigint, input: CreateVehicleInput) {
  try {
    return await fleetRepository.createVehicle({ ...input, tenantId })
  } catch (err) {
    rethrowDuplicate(err, input.registrationNo)
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
