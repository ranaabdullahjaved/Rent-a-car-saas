import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { payments, ledgerEntries } from '@/db/schema'
import type { NewPayment, NewLedgerEntry } from './finance.types'

export async function listPayments(tenantId: bigint) {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt)))
}

export async function insertPayment(input: NewPayment) {
  const [row] = await db.insert(payments).values(input).returning()
  return row
}

export async function listLedgerEntries(tenantId: bigint) {
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.tenantId, tenantId))
}

export async function insertLedgerEntry(input: NewLedgerEntry) {
  const [row] = await db.insert(ledgerEntries).values(input).returning()
  return row
}
