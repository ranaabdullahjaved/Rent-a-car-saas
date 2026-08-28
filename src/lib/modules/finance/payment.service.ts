import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookingCharges, bookings, paymentPromises, payments } from '@/db/schema'
import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { addMoney, money, multiplyMoney, subtractMoney, type Money } from '@/lib/money'
import { postLedgerEntry } from './ledger.service'
import type { LedgerCategory } from './ledger.categories'
import {
  isDeposit,
  ledgerCategoryForPurpose,
  type PromiseToPayInput,
  type RecordChargeInput,
  type RecordPaymentInput,
} from './finance.validation'

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function loadBooking(tenantId: bigint, bookingId: bigint) {
  const [row] = await db
    .select({
      id: bookings.id,
      bookingNo: bookings.bookingNo,
      customerId: bookings.customerId,
      vehicleId: bookings.vehicleId,
      totalCharges: bookings.totalCharges,
      totalPaid: bookings.totalPaid,
      status: bookings.status,
    })
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
    .limit(1)
  if (!row) throw new NotFoundError('Booking')
  return row
}

function paymentStatusFor(totalCharges: Money, totalPaid: Money): string {
  const charges = Number(totalCharges)
  const paid = Number(totalPaid)
  // Comparison only — never arithmetic. The stored values stay decimal strings.
  if (paid <= 0) return 'unpaid'
  if (paid >= charges) return 'paid'
  return 'partial'
}

/**
 * Records money received against a booking.
 *
 * The payment row, the booking's running total and the ledger entry are
 * written in one transaction. If any of them fails none of them happen, which
 * is the only way the ledger can be trusted as the single source of truth —
 * a payment that exists without its ledger row under-reports revenue forever,
 * and nothing later would reveal it.
 */
export async function recordPayment(tenantId: bigint, input: RecordPaymentInput) {
  const booking = await loadBooking(tenantId, input.bookingId)
  const amount = money(input.amount)

  try {
    return await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          tenantId,
          direction: 'in',
          partyType: 'customer',
          partyId: booking.customerId,
          bookingId: booking.id,
          amount,
          method: input.method,
          purpose: input.purpose,
          referenceNo: input.referenceNo,
          paidAt: input.paidAt,
          notes: input.notes,
        })
        .returning()

      if (!payment) throw new AppError('Could not record the payment', 'PAYMENT_FAILED', 500)

      // A security deposit is a refundable hold. Counting it towards what the
      // customer has paid would show the booking as settled while the rental
      // itself is still owed.
      if (!isDeposit(input.purpose)) {
        await tx
          .update(bookings)
          .set({
            totalPaid: sql`${bookings.totalPaid} + ${amount}::numeric`,
            paymentStatus: sql`case
              when ${bookings.totalPaid} + ${amount}::numeric <= 0 then 'unpaid'
              when ${bookings.totalPaid} + ${amount}::numeric >= ${bookings.totalCharges} then 'paid'
              else 'partial' end`,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, booking.id))
      } else {
        await tx
          .update(bookings)
          .set({ securityDeposit: sql`${bookings.securityDeposit} + ${amount}::numeric`, updatedAt: new Date() })
          .where(eq(bookings.id, booking.id))
      }

      // A deposit is not revenue, so it never reaches the ledger as income.
      // It becomes one only if it is later forfeited against damage.
      if (!isDeposit(input.purpose)) {
        await postLedgerEntry(tx, tenantId, {
          entryDate: dateOnly(input.paidAt),
          category: ledgerCategoryForPurpose(input.purpose) as LedgerCategory,
          subcategory: input.method,
          amount,
          sourceType: 'payment',
          sourceId: payment.id,
          bookingId: booking.id,
          customerId: booking.customerId,
          vehicleId: booking.vehicleId,
          description: `${booking.bookingNo} · ${input.method.replace('_', ' ')}`,
        })
      }

      return payment
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw fromDbError(err)
  }
}

/**
 * Adds a charge to a booking — rental, late fee, fuel, damage.
 *
 * Charges are what the customer owes. They deliberately do NOT write a ledger
 * entry: the ledger is cash-basis, so revenue is recognised when the payment
 * arrives. Posting both would count the same rupee twice.
 */
export async function addCharge(tenantId: bigint, input: RecordChargeInput) {
  const booking = await loadBooking(tenantId, input.bookingId)
  const amount = multiplyMoney(money(input.unitAmount), input.quantity)

  try {
    return await db.transaction(async (tx) => {
      const [charge] = await tx
        .insert(bookingCharges)
        .values({
          tenantId,
          bookingId: booking.id,
          chargeType: input.chargeType,
          description: input.description,
          quantity: input.quantity,
          unitAmount: money(input.unitAmount),
          amount,
        })
        .returning()

      await tx
        .update(bookings)
        .set({
          totalCharges: sql`${bookings.totalCharges} + ${amount}::numeric`,
          paymentStatus: sql`case
            when ${bookings.totalPaid} <= 0 then 'unpaid'
            when ${bookings.totalPaid} >= ${bookings.totalCharges} + ${amount}::numeric then 'paid'
            else 'partial' end`,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))

      return charge
    })
  } catch (err) {
    throw fromDbError(err)
  }
}

/** Posts the agreed quote onto the booking as its opening charge lines. */
export async function postQuoteAsCharges(
  tenantId: bigint,
  bookingId: bigint,
  lines: { chargeType: string; description: string | null; amount: Money }[]
) {
  const booking = await loadBooking(tenantId, bookingId)
  if (Number(booking.totalCharges) > 0) {
    throw new AppError('This booking already has charges posted.', 'ALREADY_CHARGED', 409)
  }

  const total = lines.reduce<Money>((sum, l) => addMoney(sum, l.amount), money('0'))

  return db.transaction(async (tx) => {
    for (const line of lines) {
      await tx.insert(bookingCharges).values({
        tenantId,
        bookingId,
        chargeType: line.chargeType,
        description: line.description,
        quantity: '1',
        unitAmount: line.amount,
        amount: line.amount,
      })
    }
    await tx
      .update(bookings)
      .set({ totalCharges: total, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
    return total
  })
}

/** Records when a customer said they will pay, so it can be chased. */
export async function promiseToPay(tenantId: bigint, input: PromiseToPayInput) {
  const booking = await loadBooking(tenantId, input.bookingId)
  const [row] = await db
    .insert(paymentPromises)
    .values({
      tenantId,
      bookingId: booking.id,
      customerId: booking.customerId,
      promisedAmount: money(input.promisedAmount),
      promisedDate: input.promisedDate,
      notes: input.notes,
    })
    .returning()
  return row
}

export async function listPayments(tenantId: bigint, bookingId?: bigint) {
  const where = bookingId
    ? and(eq(payments.tenantId, tenantId), eq(payments.bookingId, bookingId), isNull(payments.deletedAt))
    : and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt))

  return db.select().from(payments).where(where).orderBy(sql`${payments.paidAt} desc`).limit(200)
}

export async function listPromises(tenantId: bigint, bookingId?: bigint) {
  const where = bookingId
    ? and(eq(paymentPromises.tenantId, tenantId), eq(paymentPromises.bookingId, bookingId))
    : eq(paymentPromises.tenantId, tenantId)

  return db.select().from(paymentPromises).where(where).orderBy(sql`${paymentPromises.promisedDate} asc`)
}

/** Outstanding across the workspace — charges raised but not yet collected. */
export async function getReceivables(tenantId: bigint) {
  const [row] = await db
    .select({
      charged: sql<string>`coalesce(sum(${bookings.totalCharges}), 0)::text`,
      paid: sql<string>`coalesce(sum(${bookings.totalPaid}), 0)::text`,
      outstanding: sql<string>`coalesce(sum(${bookings.totalCharges} - ${bookings.totalPaid}), 0)::text`,
    })
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), isNull(bookings.deletedAt)))

  return {
    charged: money(row?.charged ?? '0'),
    paid: money(row?.paid ?? '0'),
    outstanding: subtractMoney(money(row?.charged ?? '0'), money(row?.paid ?? '0')),
  }
}

export { paymentStatusFor }
