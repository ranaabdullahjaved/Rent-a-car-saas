import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { vehicles } from '@/db/schema'
import type { NewVehicle } from './fleet.types'

export async function listVehicles(tenantId: bigint) {
  return db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
}

export async function findVehicleById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.id, id), isNull(vehicles.deletedAt)))
    .limit(1)
  return row
}

export async function createVehicle(input: NewVehicle) {
  const [row] = await db.insert(vehicles).values(input).returning()
  return row
}

export async function updateVehicle(tenantId: bigint, id: bigint, input: Partial<NewVehicle>) {
  const [row] = await db
    .update(vehicles)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.id, id)))
    .returning()
  return row
}

export async function softDeleteVehicle(tenantId: bigint, id: bigint) {
  const [row] = await db
    .update(vehicles)
    .set({ deletedAt: new Date() })
    .where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.id, id)))
    .returning()
  return row
}
