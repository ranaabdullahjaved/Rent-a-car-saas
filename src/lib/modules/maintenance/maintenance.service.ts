import { fromDbError } from '@/lib/errors'
import { money } from '@/lib/money'
import * as maintenanceRepository from './maintenance.repository'
import type { CreateMaintenanceRecordInput, CreateFuelLogInput } from './maintenance.validation'

export async function listMaintenanceRecords(tenantId: bigint) {
  return maintenanceRepository.listMaintenanceRecords(tenantId)
}

export async function recordMaintenance(tenantId: bigint, input: CreateMaintenanceRecordInput) {
  try {
    return await maintenanceRepository.insertMaintenanceRecord({ ...input, tenantId })
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function listMaintenanceSchedules(tenantId: bigint) {
  return maintenanceRepository.listMaintenanceSchedules(tenantId)
}

export async function recordFuelLog(tenantId: bigint, input: CreateFuelLogInput) {
  try {
    return await maintenanceRepository.insertFuelLog({
      ...input,
      amount: input.amount,
      litres: money(input.litres),
      ratePerLitre: money(input.ratePerLitre),
      tenantId,
    })
  } catch (err) {
    throw fromDbError(err)
  }
}
