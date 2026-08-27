import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { investors } from '@/db/schema'
import type { NewInvestor } from './investor.types'

export async function listInvestors(tenantId: bigint) {
  return db
    .select()
    .from(investors)
    .where(and(eq(investors.tenantId, tenantId), isNull(investors.deletedAt)))
}

export async function findInvestorById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(investors)
    .where(and(eq(investors.tenantId, tenantId), eq(investors.id, id), isNull(investors.deletedAt)))
    .limit(1)
  return row
}

export async function createInvestor(input: NewInvestor) {
  const [row] = await db.insert(investors).values(input).returning()
  return row
}

export async function updateInvestor(tenantId: bigint, id: bigint, input: Partial<NewInvestor>) {
  const [row] = await db
    .update(investors)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(investors.tenantId, tenantId), eq(investors.id, id)))
    .returning()
  return row
}
