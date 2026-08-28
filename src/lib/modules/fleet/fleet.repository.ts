import { and, asc, desc, eq, isNull, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { investors, vehicles } from '@/db/schema'
import type { NewVehicle } from './fleet.types'
import { normaliseRegistrationSearch, type FleetFilters } from './fleet.validation'

const SORT_COLUMNS = {
  registrationNo: vehicles.registrationNo,
  modelYear: vehicles.modelYear,
  currentOdometer: vehicles.currentOdometer,
  createdAt: vehicles.createdAt,
} as const

function scope(tenantId: bigint): SQL {
  // Every query in this file starts here. Tenant plus not-soft-deleted is the
  // only correct baseline for reads.
  return and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt))!
}

export async function listVehicles(tenantId: bigint, filters: FleetFilters) {
  const conditions: SQL[] = [scope(tenantId)]

  if (filters.status) conditions.push(eq(vehicles.status, filters.status))
  if (filters.ownershipType) conditions.push(eq(vehicles.ownershipType, filters.ownershipType))

  if (filters.q) {
    const like = `%${filters.q.toLowerCase()}%`
    const regLike = `%${normaliseRegistrationSearch(filters.q)}%`
    conditions.push(
      or(
        // Compare registrations with separators removed on both sides so
        // "lea011234", "LEA 01 1234" and "lea-01-1234" all match.
        sql`replace(replace(${vehicles.registrationNo}, '-', ''), ' ', '') like ${regLike}`,
        sql`lower(${vehicles.make}) like ${like}`,
        sql`lower(${vehicles.model}) like ${like}`,
        sql`lower(coalesce(${vehicles.variant}, '')) like ${like}`
      )!
    )
  }

  const column = SORT_COLUMNS[filters.sort]
  const direction = filters.dir === 'asc' ? asc : desc

  return db
    .select({
      id: vehicles.id,
      registrationNo: vehicles.registrationNo,
      make: vehicles.make,
      model: vehicles.model,
      variant: vehicles.variant,
      modelYear: vehicles.modelYear,
      status: vehicles.status,
      ownershipType: vehicles.ownershipType,
      currentOdometer: vehicles.currentOdometer,
      fuelType: vehicles.fuelType,
      transmission: vehicles.transmission,
      investorName: investors.name,
    })
    .from(vehicles)
    .leftJoin(investors, eq(investors.id, vehicles.investorId))
    .where(and(...conditions))
    .orderBy(direction(column))
    .limit(200)
}

export async function countByStatus(tenantId: bigint) {
  return db
    .select({ status: vehicles.status, count: sql<number>`count(*)::int` })
    .from(vehicles)
    .where(scope(tenantId))
    .groupBy(vehicles.status)
}

export async function findVehicleById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(vehicles)
    .where(and(scope(tenantId), eq(vehicles.id, id)))
    .limit(1)
  return row
}

export async function findVehicleWithInvestor(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select({ vehicle: vehicles, investorName: investors.name })
    .from(vehicles)
    .leftJoin(investors, eq(investors.id, vehicles.investorId))
    .where(and(scope(tenantId), eq(vehicles.id, id)))
    .limit(1)
  return row
}

export async function listInvestorOptions(tenantId: bigint) {
  return db
    .select({ id: investors.id, name: investors.name })
    .from(investors)
    .where(and(eq(investors.tenantId, tenantId), isNull(investors.deletedAt)))
    .orderBy(asc(investors.name))
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
