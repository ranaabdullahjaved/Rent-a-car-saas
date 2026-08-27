import { NotFoundError, fromDbError } from '@/lib/errors'
import * as fleetRepository from './fleet.repository'
import type { CreateVehicleInput, UpdateVehicleInput } from './fleet.validation'

export async function listVehicles(tenantId: bigint) {
  return fleetRepository.listVehicles(tenantId)
}

export async function getVehicle(tenantId: bigint, id: bigint) {
  const vehicle = await fleetRepository.findVehicleById(tenantId, id)
  if (!vehicle) throw new NotFoundError('Vehicle')
  return vehicle
}

export async function createVehicle(tenantId: bigint, input: CreateVehicleInput) {
  try {
    return await fleetRepository.createVehicle({ ...input, tenantId })
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function updateVehicle(tenantId: bigint, id: bigint, input: UpdateVehicleInput) {
  await getVehicle(tenantId, id)
  try {
    return await fleetRepository.updateVehicle(tenantId, id, input)
  } catch (err) {
    throw fromDbError(err)
  }
}
