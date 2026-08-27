import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { maintenanceRecords, maintenanceSchedules, fuelLogs } from '@/db/schema'

export async function listMaintenanceRecords(tenantId: bigint) {
  return db
    .select()
    .from(maintenanceRecords)
    .where(and(eq(maintenanceRecords.tenantId, tenantId), isNull(maintenanceRecords.deletedAt)))
}

export async function insertMaintenanceRecord(input: typeof maintenanceRecords.$inferInsert) {
  const [row] = await db.insert(maintenanceRecords).values(input).returning()
  return row
}

export async function listMaintenanceSchedules(tenantId: bigint) {
  return db
    .select()
    .from(maintenanceSchedules)
    .where(and(eq(maintenanceSchedules.tenantId, tenantId), eq(maintenanceSchedules.isActive, true)))
}

export async function insertFuelLog(input: typeof fuelLogs.$inferInsert) {
  const [row] = await db.insert(fuelLogs).values(input).returning()
  return row
}

export async function listFuelLogs(tenantId: bigint) {
  return db.select().from(fuelLogs).where(eq(fuelLogs.tenantId, tenantId))
}
