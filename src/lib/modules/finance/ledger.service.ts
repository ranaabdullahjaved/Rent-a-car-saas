import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { ledgerEntries } from '@/db/schema'
import { AppError } from '@/lib/errors'
import { money, type Money } from '@/lib/money'
import { isIncomeCategory, type LedgerCategory, type LedgerSourceType } from './ledger.categories'

/**
 * Anything that can run an insert — the pooled client, or a transaction.
 *
 * The writer takes this rather than reaching for `db` itself, which is the
 * whole point: a ledger entry must be written in the SAME transaction as the
 * thing it records. Posting afterwards, on a separate connection, allows a
 * payment to exist with no ledger row, and the reports silently under-report
 * from then on.
 */
export type LedgerExecutor = Pick<typeof db, 'insert'>

export type PostLedgerInput = {
  entryDate: string // date column — 'YYYY-MM-DD', never a timestamp
  category: LedgerCategory
  subcategory?: string | null
  amount: Money
  sourceType: LedgerSourceType
  sourceId: bigint
  description?: string | null
  isCash?: boolean
  vehicleId?: bigint | null
  bookingId?: bigint | null
  investorId?: bigint | null
  vendorId?: bigint | null
  customerId?: bigint | null
  employeeId?: bigint | null
}

/**
 * Writes one ledger row.
 *
 * The ledger is kept on a CASH basis: a row exists when money actually moves.
 * A booking charge is a receivable, not income, and lives on the booking until
 * it is paid — otherwise revenue would be counted twice, once when charged and
 * again when collected. This matches how the brief describes the business:
 * "how much money I spend and where I did it and how much I earned and from
 * where."
 *
 * Direction is derived from the category rather than passed in, so the two can
 * never disagree.
 */
export async function postLedgerEntry(
  exec: LedgerExecutor,
  tenantId: bigint,
  input: PostLedgerInput
) {
  const amount = money(input.amount)

  // The sign lives in `direction`; a negative amount would make every SUM wrong
  // in a way that is very hard to spot. Reversals use reverseLedgerEntry.
  if (amount.startsWith('-')) {
    throw new AppError(
      'Ledger amounts must be positive — the direction carries the sign.',
      'INVALID_LEDGER_AMOUNT',
      422
    )
  }

  const [row] = await exec
    .insert(ledgerEntries)
    .values({
      tenantId,
      entryDate: input.entryDate,
      direction: isIncomeCategory(input.category) ? 'income' : 'expense',
      category: input.category,
      subcategory: input.subcategory ?? null,
      amount,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      description: input.description ?? null,
      isCash: input.isCash ?? true,
      vehicleId: input.vehicleId ?? null,
      bookingId: input.bookingId ?? null,
      investorId: input.investorId ?? null,
      vendorId: input.vendorId ?? null,
      customerId: input.customerId ?? null,
      employeeId: input.employeeId ?? null,
    })
    .returning()

  return row
}

/**
 * Corrects a ledger row by writing its opposite, never by editing it.
 *
 * ledger_entries is insert-only. An accountant must be able to see that a
 * figure was wrong and what it was corrected to, which an UPDATE destroys.
 */
export async function reverseLedgerEntry(
  exec: LedgerExecutor,
  tenantId: bigint,
  original: {
    id: bigint
    entryDate: string
    category: string
    amount: string
    sourceType: string
    sourceId: bigint
    vehicleId: bigint | null
    bookingId: bigint | null
    investorId: bigint | null
    vendorId: bigint | null
    customerId: bigint | null
    employeeId: bigint | null
  },
  reason: string
) {
  const [row] = await exec
    .insert(ledgerEntries)
    .values({
      tenantId,
      entryDate: original.entryDate,
      // Same direction and a positive amount, flagged as a reversal — reports
      // exclude reversed pairs rather than trying to net negative rows.
      direction: isIncomeCategory(original.category) ? 'income' : 'expense',
      category: original.category,
      amount: original.amount,
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      isReversal: true,
      reversesId: original.id,
      description: `Reversal: ${reason}`,
      vehicleId: original.vehicleId,
      bookingId: original.bookingId,
      investorId: original.investorId,
      vendorId: original.vendorId,
      customerId: original.customerId,
      employeeId: original.employeeId,
    })
    .returning()

  return row
}

/** Ledger rows excluding reversals and the entries they reverse. */
export function liveEntriesFilter() {
  return sql`${ledgerEntries.isReversal} = false and ${ledgerEntries.id} not in (
    select ${ledgerEntries.reversesId} from ${ledgerEntries}
    where ${ledgerEntries.reversesId} is not null
  )`
}

export async function getLedgerEntry(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(ledgerEntries)
    .where(sql`${ledgerEntries.tenantId} = ${tenantId} and ${ledgerEntries.id} = ${id}`)
    .limit(1)
  return row
}

export async function listLedgerEntries(tenantId: bigint, limit = 200) {
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.tenantId, tenantId))
    .orderBy(sql`${ledgerEntries.entryDate} desc, ${ledgerEntries.id} desc`)
    .limit(limit)
}
