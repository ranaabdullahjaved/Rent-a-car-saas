import { and, asc, desc, eq, gte, isNull, lt, lte, ne, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookingCharges, bookings, customers, vehicles } from '@/db/schema'
import type { NewBooking } from './booking.types'
import { BLOCKING_STATUSES, type BookingFilters } from './booking.validation'

const SORT_COLUMNS = {
  startAt: bookings.startAt,
  endAt: bookings.endAt,
  createdAt: bookings.createdAt,
} as const

function scope(tenantId: bigint): SQL {
  return and(eq(bookings.tenantId, tenantId), isNull(bookings.deletedAt))!
}

/**
 * The window a booking occupies, buffer included — mirrors the trigger.
 *
 * Returned as ISO strings as well as Dates: a raw `sql` fragment has no column
 * type to infer from, so a Date passed straight in reaches the driver as an
 * unsupported parameter. Those call sites use the string with an explicit cast.
 */
function blockWindow(startAt: Date, endAt: Date, bufferMinutes: number) {
  const to = new Date(endAt.getTime() + bufferMinutes * 60_000)
  return { from: startAt, to, fromIso: startAt.toISOString(), toIso: to.toISOString() }
}

export async function listBookings(tenantId: bigint, filters: BookingFilters) {
  const conditions: SQL[] = [scope(tenantId)]
  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  if (filters.status) conditions.push(eq(bookings.status, filters.status))

  switch (filters.view) {
    case 'today':
      conditions.push(and(lt(bookings.startAt, dayEnd), gte(bookings.endAt, dayStart))!)
      break
    case 'departing':
      conditions.push(and(gte(bookings.startAt, dayStart), lt(bookings.startAt, dayEnd))!)
      break
    case 'returning':
      conditions.push(and(gte(bookings.endAt, dayStart), lt(bookings.endAt, dayEnd))!)
      break
    case 'overdue':
      // Still out, past its return time, and not yet checked in.
      conditions.push(
        and(
          lt(bookings.endAt, now),
          isNull(bookings.actualEndAt),
          sql`${bookings.status} in ('dispatched','active')`
        )!
      )
      break
  }

  if (filters.q) {
    const like = `%${filters.q.toLowerCase()}%`
    conditions.push(
      or(
        sql`lower(${bookings.bookingNo}) like ${like}`,
        sql`lower(${customers.fullName}) like ${like}`,
        sql`lower(coalesce(${vehicles.registrationNo}, '')) like ${like}`
      )!
    )
  }

  const column = SORT_COLUMNS[filters.sort]
  const direction = filters.dir === 'asc' ? asc : desc

  return db
    .select({
      id: bookings.id,
      bookingNo: bookings.bookingNo,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      bookingType: bookings.bookingType,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      actualEndAt: bookings.actualEndAt,
      estimatedTotal: bookings.estimatedTotal,
      totalPaid: bookings.totalPaid,
      balanceDue: bookings.balanceDue,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      vehicleRegistration: vehicles.registrationNo,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .leftJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(and(...conditions))
    .orderBy(direction(column))
    .limit(200)
}

export async function findBookingById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select({
      booking: bookings,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerId: customers.id,
      vehicleRegistration: vehicles.registrationNo,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .leftJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(and(scope(tenantId), eq(bookings.id, id)))
    .limit(1)
  return row
}

/**
 * The booking that would clash with this window on this vehicle.
 *
 * Advisory only. The exclusion constraint remains the source of truth — this
 * exists to name the offender in an error message and to grey out vehicles in
 * the picker, never to decide whether an insert is safe. Checking here and
 * then inserting is precisely the race the constraint eliminates.
 */
export async function findConflictingBooking(
  tenantId: bigint,
  vehicleId: bigint,
  startAt: Date,
  endAt: Date,
  bufferMinutes: number,
  excludeBookingId?: bigint | null
) {
  const win = blockWindow(startAt, endAt, bufferMinutes)
  const conditions: SQL[] = [
    scope(tenantId),
    eq(bookings.vehicleId, vehicleId),
    sql`${bookings.status} in ${BLOCKING_STATUSES}`,
    // Half-open overlap, matching the tstzrange '[)' the trigger builds.
    lt(bookings.startAt, win.to),
    sql`(${bookings.endAt} + make_interval(mins => coalesce(${bookings.bufferMinutes}, 0))) > ${win.fromIso}::timestamptz`,
  ]
  if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId))

  const [row] = await db
    .select({
      id: bookings.id,
      bookingNo: bookings.bookingNo,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      status: bookings.status,
      customerName: customers.fullName,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .where(and(...conditions))
    .limit(1)
  return row
}

/** Vehicles with no blocking booking overlapping the requested window. */
export async function findAvailableVehicles(
  tenantId: bigint,
  startAt: Date,
  endAt: Date,
  bufferMinutes: number,
  excludeBookingId?: bigint | null
) {
  const win = blockWindow(startAt, endAt, bufferMinutes)

  const clash = db
    .select({ vehicleId: bookings.vehicleId })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        isNull(bookings.deletedAt),
        sql`${bookings.status} in ${BLOCKING_STATUSES}`,
        lt(bookings.startAt, win.to),
        sql`(${bookings.endAt} + make_interval(mins => coalesce(${bookings.bufferMinutes}, 0))) > ${win.fromIso}::timestamptz`,
        excludeBookingId ? ne(bookings.id, excludeBookingId) : sql`true`
      )
    )

  return db
    .select({
      id: vehicles.id,
      registrationNo: vehicles.registrationNo,
      make: vehicles.make,
      model: vehicles.model,
      status: vehicles.status,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        isNull(vehicles.deletedAt),
        // A car in the workshop or written off is not bookable regardless of
        // whether anything overlaps.
        sql`${vehicles.status} in ('available','on_rent')`,
        sql`${vehicles.id} not in ${clash}`
      )
    )
    .orderBy(asc(vehicles.registrationNo))
}

/**
 * Next booking number for the tenant, as BK-YYYYMM-NNNN.
 *
 * Read-then-insert can race, so the caller retries on the unique violation
 * from bookings_tenant_booking_no_unique rather than trusting this to be
 * atomic on its own.
 */
export async function nextBookingNo(tenantId: bigint, when: Date): Promise<string> {
  const period = `${when.getUTCFullYear()}${String(when.getUTCMonth() + 1).padStart(2, '0')}`
  const prefix = `BK-${period}-`

  const [row] = await db
    .select({
      maxSuffix: sql<number>`coalesce(max(substring(${bookings.bookingNo} from '[0-9]+$')::int), 0)`,
    })
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), sql`${bookings.bookingNo} like ${prefix + '%'}`))

  return `${prefix}${String((row?.maxSuffix ?? 0) + 1).padStart(4, '0')}`
}

export async function createBooking(input: NewBooking) {
  const [row] = await db.insert(bookings).values(input).returning()
  return row
}

export async function updateBooking(tenantId: bigint, id: bigint, input: Partial<NewBooking>) {
  const [row] = await db
    .update(bookings)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id)))
    .returning()
  return row
}

export async function listBookingCharges(tenantId: bigint, bookingId: bigint) {
  return db
    .select()
    .from(bookingCharges)
    .where(and(eq(bookingCharges.tenantId, tenantId), eq(bookingCharges.bookingId, bookingId)))
    .orderBy(asc(bookingCharges.createdAt))
}

export async function countByStatus(tenantId: bigint) {
  return db
    .select({ status: bookings.status, count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(scope(tenantId))
    .groupBy(bookings.status)
}

export async function countOverdue(tenantId: bigint) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        scope(tenantId),
        lte(bookings.endAt, new Date()),
        isNull(bookings.actualEndAt),
        sql`${bookings.status} in ('dispatched','active')`
      )
    )
  return row?.count ?? 0
}

/**
 * Everything the availability timeline needs for a window: every vehicle in
 * the fleet, and every booking that overlaps the window. Cancelled bookings
 * are omitted; tentative ones are included so the timeline can show them as
 * holds that do not actually block.
 */
export async function listBookingsForTimeline(
  tenantId: bigint,
  windowStart: Date,
  windowEnd: Date
) {
  const [fleet, spans] = await Promise.all([
    db
      .select({
        id: vehicles.id,
        registrationNo: vehicles.registrationNo,
        make: vehicles.make,
        model: vehicles.model,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .orderBy(asc(vehicles.registrationNo)),
    db
      .select({
        id: bookings.id,
        vehicleId: bookings.vehicleId,
        bookingNo: bookings.bookingNo,
        status: bookings.status,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        bufferMinutes: bookings.bufferMinutes,
        customerName: customers.fullName,
      })
      .from(bookings)
      .innerJoin(customers, eq(customers.id, bookings.customerId))
      .where(
        and(
          scope(tenantId),
          sql`${bookings.vehicleId} is not null`,
          sql`${bookings.status} != 'cancelled'`,
          lt(bookings.startAt, sql`${windowEnd.toISOString()}::timestamptz`),
          sql`(${bookings.endAt} + make_interval(mins => coalesce(${bookings.bufferMinutes}, 0))) > ${windowStart.toISOString()}::timestamptz`
        )
      )
      .orderBy(asc(bookings.startAt)),
  ])

  return { fleet, spans }
}
