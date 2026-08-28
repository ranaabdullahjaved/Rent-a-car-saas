import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookingCharges, bookings, customers, damageRecords, trafficChallans, vehicles } from '@/db/schema'
import { AppError, NotFoundError, fromDbError } from '@/lib/errors'
import { money } from '@/lib/money'
import type { RecordChallanInput, RecordDamageInput } from './incident.validation'

function damageScope(tenantId: bigint): SQL {
  return and(eq(damageRecords.tenantId, tenantId), isNull(damageRecords.deletedAt))!
}

/**
 * Records a damage incident and, when the customer is being charged, raises
 * that charge on their booking in the same transaction.
 *
 * The ledger is not touched here. It is cash-basis: the repair becomes an
 * expense when it is actually paid (recorded through the expense module,
 * attributed to this vehicle), and the amount charged becomes income when the
 * customer pays it. Posting anything at incident time would recognise money
 * that has not moved.
 */
export async function recordDamage(tenantId: bigint, input: RecordDamageInput) {
  const charged = money(input.amountChargedToCustomer)

  try {
    return await db.transaction(async (tx) => {
      if (input.bookingId) {
        const [booking] = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.tenantId, tenantId),
              eq(bookings.id, input.bookingId),
              isNull(bookings.deletedAt)
            )
          )
          .limit(1)
        if (!booking) throw new NotFoundError('Booking')
      }

      const [damage] = await tx
        .insert(damageRecords)
        .values({
          tenantId,
          vehicleId: input.vehicleId,
          bookingId: input.bookingId,
          severity: input.severity,
          atFault: input.atFault,
          description: input.description,
          location: input.location,
          incidentAt: input.incidentAt,
          policeReportNo: input.policeReportNo,
          estimatedCost: money(input.estimatedCost),
          actualRepairCost: money(input.actualRepairCost),
          amountChargedToCustomer: charged,
          downtimeDays: input.downtimeDays,
          status: input.status,
          notes: input.notes,
        })
        .returning()

      if (!damage) throw new AppError('Could not record the damage', 'DAMAGE_FAILED', 500)

      // Billing the customer is a receivable on their booking, exactly like any
      // other charge, so it flows through balance_due and the closure gate.
      if (Number(charged) > 0 && input.bookingId) {
        await tx.insert(bookingCharges).values({
          tenantId,
          bookingId: input.bookingId,
          chargeType: 'damage',
          description: input.description.slice(0, 200),
          quantity: '1',
          unitAmount: charged,
          amount: charged,
        })

        await tx
          .update(bookings)
          .set({
            totalCharges: sql`${bookings.totalCharges} + ${charged}::numeric`,
            paymentStatus: sql`case
              when ${bookings.totalPaid} <= 0 then 'unpaid'
              when ${bookings.totalPaid} >= ${bookings.totalCharges} + ${charged}::numeric then 'paid'
              else 'partial' end`,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, input.bookingId))
      }

      return damage
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw fromDbError(err)
  }
}

export async function getDamage(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(damageRecords)
    .where(and(damageScope(tenantId), eq(damageRecords.id, id)))
    .limit(1)
  if (!row) throw new NotFoundError('Damage record')
  return row
}

export async function listDamage(tenantId: bigint, filters: { vehicleId?: bigint; bookingId?: bigint } = {}) {
  const conditions: SQL[] = [damageScope(tenantId)]
  if (filters.vehicleId) conditions.push(eq(damageRecords.vehicleId, filters.vehicleId))
  if (filters.bookingId) conditions.push(eq(damageRecords.bookingId, filters.bookingId))

  return db
    .select({
      id: damageRecords.id,
      vehicleId: damageRecords.vehicleId,
      bookingId: damageRecords.bookingId,
      severity: damageRecords.severity,
      atFault: damageRecords.atFault,
      description: damageRecords.description,
      incidentAt: damageRecords.incidentAt,
      estimatedCost: damageRecords.estimatedCost,
      actualRepairCost: damageRecords.actualRepairCost,
      amountChargedToCustomer: damageRecords.amountChargedToCustomer,
      amountRecovered: damageRecords.amountRecovered,
      downtimeDays: damageRecords.downtimeDays,
      status: damageRecords.status,
      vehicleRegistration: vehicles.registrationNo,
      bookingNo: bookings.bookingNo,
      customerName: customers.fullName,
    })
    .from(damageRecords)
    .leftJoin(vehicles, eq(vehicles.id, damageRecords.vehicleId))
    .leftJoin(bookings, eq(bookings.id, damageRecords.bookingId))
    .leftJoin(customers, eq(customers.id, bookings.customerId))
    .where(and(...conditions))
    .orderBy(desc(damageRecords.incidentAt))
    .limit(200)
}

/** Records a traffic challan against a vehicle. */
export async function recordChallan(tenantId: bigint, input: RecordChallanInput) {
  try {
    const [row] = await db
      .insert(trafficChallans)
      .values({
        tenantId,
        vehicleId: input.vehicleId,
        bookingId: input.bookingId,
        challanNo: input.challanNo,
        violationType: input.violationType,
        violationAt: input.violationAt,
        location: input.location,
        amount: money(input.amount),
        lateSurcharge: money(input.lateSurcharge),
        liability: input.liability,
        status: input.status,
        notes: input.notes,
      })
      .returning()
    return row
  } catch (err) {
    throw fromDbError(err)
  }
}

export async function listChallans(
  tenantId: bigint,
  filters: { vehicleId?: bigint; bookingId?: bigint } = {}
) {
  const conditions: SQL[] = [eq(trafficChallans.tenantId, tenantId)]
  if (filters.vehicleId) conditions.push(eq(trafficChallans.vehicleId, filters.vehicleId))
  if (filters.bookingId) conditions.push(eq(trafficChallans.bookingId, filters.bookingId))

  return db
    .select({
      id: trafficChallans.id,
      vehicleId: trafficChallans.vehicleId,
      bookingId: trafficChallans.bookingId,
      challanNo: trafficChallans.challanNo,
      violationType: trafficChallans.violationType,
      violationAt: trafficChallans.violationAt,
      amount: trafficChallans.amount,
      lateSurcharge: trafficChallans.lateSurcharge,
      liability: trafficChallans.liability,
      amountRecovered: trafficChallans.amountRecovered,
      status: trafficChallans.status,
      vehicleRegistration: vehicles.registrationNo,
      bookingNo: bookings.bookingNo,
    })
    .from(trafficChallans)
    .leftJoin(vehicles, eq(vehicles.id, trafficChallans.vehicleId))
    .leftJoin(bookings, eq(bookings.id, trafficChallans.bookingId))
    .where(and(...conditions))
    .orderBy(desc(trafficChallans.violationAt))
    .limit(200)
}

/**
 * Everything that must be settled before a booking can be closed.
 *
 * This is the operator's own end-of-booking routine from the brief: no
 * unrecorded damage, no unpaid challan, nothing still owed.
 */
export async function getClosureBlockers(tenantId: bigint, bookingId: bigint) {
  const [openDamage, unpaidChallans, [booking]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(damageRecords)
      .where(
        and(
          damageScope(tenantId),
          eq(damageRecords.bookingId, bookingId),
          sql`${damageRecords.status} in ('open','repairing')`
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(trafficChallans)
      .where(
        and(
          eq(trafficChallans.tenantId, tenantId),
          eq(trafficChallans.bookingId, bookingId),
          eq(trafficChallans.status, 'pending')
        )
      ),
    db
      .select({ balanceDue: bookings.balanceDue, actualEndAt: bookings.actualEndAt })
      .from(bookings)
      .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, bookingId)))
      .limit(1),
  ])

  const blockers: string[] = []
  if (!booking) throw new NotFoundError('Booking')
  if (!booking.actualEndAt) blockers.push('The vehicle has not been checked in yet')
  if ((openDamage[0]?.n ?? 0) > 0) blockers.push('Damage is still open or under repair')
  if ((unpaidChallans[0]?.n ?? 0) > 0) blockers.push('A traffic challan is still unpaid')
  if (Number(booking.balanceDue ?? '0') > 0) blockers.push('There is still a balance owing')

  return blockers
}
