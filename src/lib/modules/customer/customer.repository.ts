import { and, asc, desc, eq, isNull, ne, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { customers } from '@/db/schema'
import type { NewCustomer } from './customer.types'
import { normalisePhone, type CustomerFilters } from './customer.validation'

const SORT_COLUMNS = {
  fullName: customers.fullName,
  createdAt: customers.createdAt,
  totalBookings: customers.totalBookings,
} as const

function scope(tenantId: bigint): SQL {
  return and(eq(customers.tenantId, tenantId), isNull(customers.deletedAt))!
}

/** Digits-only phone, matching normalisePhone, computed in SQL. */
const phoneDigits = sql`regexp_replace(${customers.phone}, '[^0-9]', '', 'g')`

export async function listCustomers(tenantId: bigint, filters: CustomerFilters) {
  const conditions: SQL[] = [scope(tenantId)]

  if (filters.riskRating) conditions.push(eq(customers.riskRating, filters.riskRating))
  if (filters.customerType) conditions.push(eq(customers.customerType, filters.customerType))

  if (filters.q) {
    const like = `%${filters.q.toLowerCase()}%`
    const digits = filters.q.replace(/\D/g, '')
    const clauses: SQL[] = [
      sql`lower(${customers.fullName}) like ${like}`,
    ]
    // Only treat the query as a phone or CNIC when it actually contains
    // digits, otherwise every name search also scans those columns.
    if (digits.length >= 4) {
      clauses.push(sql`${phoneDigits} like ${`%${normalisePhone(digits)}%`}`)
      clauses.push(sql`coalesce(${customers.cnic}, '') like ${`%${digits}%`}`)
    }
    conditions.push(or(...clauses)!)
  }

  const column = SORT_COLUMNS[filters.sort]
  const direction = filters.dir === 'asc' ? asc : desc

  return db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      cnic: customers.cnic,
      city: customers.city,
      customerType: customers.customerType,
      riskRating: customers.riskRating,
      totalBookings: customers.totalBookings,
      licenseExpiry: customers.licenseExpiry,
    })
    .from(customers)
    .where(and(...conditions))
    .orderBy(direction(column))
    .limit(200)
}

export async function findCustomerById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(scope(tenantId), eq(customers.id, id)))
    .limit(1)
  return row
}

/**
 * Finds an existing customer that looks like the one being entered — exact
 * CNIC, or the same phone number however it was written. Used to warn before
 * creating a second record and splitting someone's history and dues.
 */
export async function findPossibleDuplicates(
  tenantId: bigint,
  input: { cnic: string | null; phone: string },
  excludeId?: bigint
) {
  const clauses: SQL[] = [sql`${phoneDigits} like ${`%${normalisePhone(input.phone)}%`}`]
  if (input.cnic) clauses.push(eq(customers.cnic, input.cnic))

  const conditions: SQL[] = [scope(tenantId), or(...clauses)!]
  if (excludeId) conditions.push(ne(customers.id, excludeId))

  return db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      cnic: customers.cnic,
    })
    .from(customers)
    .where(and(...conditions))
    .limit(5)
}

export async function countByRisk(tenantId: bigint) {
  return db
    .select({ riskRating: customers.riskRating, count: sql<number>`count(*)::int` })
    .from(customers)
    .where(scope(tenantId))
    .groupBy(customers.riskRating)
}

export async function createCustomer(input: NewCustomer) {
  const [row] = await db.insert(customers).values(input).returning()
  return row
}

export async function updateCustomer(tenantId: bigint, id: bigint, input: Partial<NewCustomer>) {
  const [row] = await db
    .update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
    .returning()
  return row
}

export async function softDeleteCustomer(tenantId: bigint, id: bigint) {
  const [row] = await db
    .update(customers)
    .set({ deletedAt: new Date() })
    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
    .returning()
  return row
}
