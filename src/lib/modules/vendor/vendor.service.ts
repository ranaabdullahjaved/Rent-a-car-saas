import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookings, customers, vendors } from '@/db/schema'
import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { ZERO, addMoney, money, subtractMoney, type Money } from '@/lib/money'
import type { CreateVendorInput, SetOutsourcingInput } from './vendor.validation'

function scope(tenantId: bigint): SQL {
  return and(eq(vendors.tenantId, tenantId), isNull(vendors.deletedAt))!
}

export async function listVendors(tenantId: bigint) {
  return db
    .select()
    .from(vendors)
    .where(scope(tenantId))
    .orderBy(asc(vendors.name))
    .limit(200)
}

export async function getVendor(tenantId: bigint, id: bigint) {
  const [row] = await db.select().from(vendors).where(and(scope(tenantId), eq(vendors.id, id))).limit(1)
  if (!row) throw new NotFoundError('Vendor')
  return row
}

export async function createVendor(tenantId: bigint, input: CreateVendorInput) {
  try {
    const [row] = await db.insert(vendors).values({ ...input, tenantId }).returning()
    return row
  } catch (err) {
    throw fromDbError(err)
  }
}

/**
 * Marks a booking as outsourced and records what the other operator charges.
 *
 * Inbound jobs carry no vehicle of ours, which is why the booking schema
 * allows a null vehicle when the source is outsourced — the exclusion
 * constraint has nothing to reserve.
 */
export async function setOutsourcing(tenantId: bigint, input: SetOutsourcingInput) {
  await getVendor(tenantId, input.vendorId)

  const [booking] = await db
    .select({ id: bookings.id, vehicleId: bookings.vehicleId })
    .from(bookings)
    .where(
      and(eq(bookings.tenantId, tenantId), eq(bookings.id, input.bookingId), isNull(bookings.deletedAt))
    )
    .limit(1)
  if (!booking) throw new NotFoundError('Booking')

  // An outbound job is one of our own cars going out, so it must have one.
  if (input.outsourceDirection === 'outbound' && !booking.vehicleId) {
    throw new AppError(
      'An outbound job lends one of your vehicles — assign the vehicle first.',
      'VEHICLE_REQUIRED',
      422
    )
  }

  const [row] = await db
    .update(bookings)
    .set({
      source: 'outsourced',
      outsourceDirection: input.outsourceDirection,
      vendorId: input.vendorId,
      vendorAmount: money(input.vendorAmount),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, input.bookingId))
    .returning()

  return row
}

export type OutsourcingRow = {
  bookingId: bigint
  bookingNo: string
  direction: string
  vendorId: bigint | null
  vendorName: string | null
  customerName: string
  customerRevenue: Money
  vendorCost: Money
  margin: Money
}

/**
 * Margin on every outsourced job.
 *
 * Inbound: we bill the customer and pay the vendor, so the margin is what we
 * charged less what they charged. Outbound: the vendor pays us for our car and
 * there is no cost of sale, so their fee is the whole margin.
 *
 * Losses are reported, not hidden — the operator asked "how many cars I
 * outsourced and profits I made from them", and a job that lost money is part
 * of that answer.
 */
export async function getOutsourcingLedger(tenantId: bigint): Promise<OutsourcingRow[]> {
  const rows = await db
    .select({
      bookingId: bookings.id,
      bookingNo: bookings.bookingNo,
      direction: bookings.outsourceDirection,
      vendorId: bookings.vendorId,
      vendorName: vendors.name,
      customerName: customers.fullName,
      totalCharges: bookings.totalCharges,
      vendorAmount: bookings.vendorAmount,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .leftJoin(vendors, eq(vendors.id, bookings.vendorId))
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        isNull(bookings.deletedAt),
        sql`${bookings.outsourceDirection} is not null`
      )
    )
    .orderBy(desc(bookings.startAt))
    .limit(200)

  return rows.map((r) => {
    const revenue = money(r.totalCharges)
    const cost = money(r.vendorAmount)
    return {
      bookingId: r.bookingId,
      bookingNo: r.bookingNo,
      direction: r.direction ?? 'inbound',
      vendorId: r.vendorId,
      vendorName: r.vendorName,
      customerName: r.customerName,
      customerRevenue: r.direction === 'outbound' ? cost : revenue,
      vendorCost: r.direction === 'outbound' ? ZERO : cost,
      margin: r.direction === 'outbound' ? cost : subtractMoney(revenue, cost),
    }
  })
}

/** Totals for the outsourcing widget, including how many jobs lost money. */
export async function getOutsourcingSummary(tenantId: bigint) {
  const rows = await getOutsourcingLedger(tenantId)

  let margin: Money = ZERO
  let inbound = 0
  let outbound = 0
  let lossMaking = 0

  for (const r of rows) {
    margin = addMoney(margin, r.margin)
    if (r.direction === 'outbound') outbound++
    else inbound++
    if (r.margin.startsWith('-')) lossMaking++
  }

  return { jobs: rows.length, inbound, outbound, margin, lossMaking }
}
