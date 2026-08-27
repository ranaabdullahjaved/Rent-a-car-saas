import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { customers } from '@/db/schema'
import type { NewCustomer } from './customer.types'

export async function listCustomers(tenantId: bigint) {
  return db
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), isNull(customers.deletedAt)))
}

export async function findCustomerById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id), isNull(customers.deletedAt)))
    .limit(1)
  return row
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
