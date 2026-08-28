import { and, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookings, investors, ledgerEntries, vehicles } from '@/db/schema'
import { ZERO, addMoney, money, subtractMoney } from '@/lib/money'
import type { Money } from '@/lib/money'
import type { Period } from './report.periods'

// Re-exported so callers can reach the whole reporting surface from one import.
export {
  changeVersus,
  fleetUtilisation,
  monthToDate,
  periodDays,
  previousPeriod,
  type Period,
} from './report.periods'

function inPeriod(period: Period) {
  return and(gte(ledgerEntries.entryDate, period.from), lte(ledgerEntries.entryDate, period.to))!
}

export type CashPosition = {
  income: Money
  expense: Money
  net: Money
}

/** Money in, money out and the difference, straight from the ledger. */
export async function getCashPosition(tenantId: bigint, period: Period): Promise<CashPosition> {
  const rows = await db
    .select({
      direction: ledgerEntries.direction,
      total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)::text`,
    })
    .from(ledgerEntries)
    .where(
      and(eq(ledgerEntries.tenantId, tenantId), eq(ledgerEntries.isReversal, false), inPeriod(period))
    )
    .groupBy(ledgerEntries.direction)

  const income = money(rows.find((r) => r.direction === 'income')?.total ?? '0')
  const expense = money(rows.find((r) => r.direction === 'expense')?.total ?? '0')
  return { income, expense, net: subtractMoney(income, expense) }
}

export type VehicleProfit = {
  vehicleId: bigint
  registrationNo: string
  make: string
  model: string
  ownershipType: string
  investorName: string | null
  revenue: Money
  directCosts: Money
  net: Money
  daysOnRoad: number
  bookings: number
}

/**
 * Revenue, cost and net per vehicle — the report the product is sold on.
 *
 * Costs are only meaningful here because expenses that belong to a car are
 * required to name it; anything left as overhead is deliberately excluded
 * rather than apportioned, so a car's number is money genuinely traceable to
 * that car and nothing else.
 */
export async function getVehicleProfitability(
  tenantId: bigint,
  period: Period
): Promise<VehicleProfit[]> {
  const [ledgerRows, bookingRows, fleet] = await Promise.all([
    db
      .select({
        vehicleId: ledgerEntries.vehicleId,
        direction: ledgerEntries.direction,
        total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)::text`,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.tenantId, tenantId),
          eq(ledgerEntries.isReversal, false),
          sql`${ledgerEntries.vehicleId} is not null`,
          inPeriod(period)
        )
      )
      .groupBy(ledgerEntries.vehicleId, ledgerEntries.direction),

    // Days a car was actually out, clipped to the period so a booking that
    // straddles the boundary only counts the part inside it.
    db
      .select({
        vehicleId: bookings.vehicleId,
        bookingCount: sql<number>`count(*)::int`,
        days: sql<number>`coalesce(sum(
          greatest(0, extract(epoch from (
            least(${bookings.endAt}, (${period.to}::date + 1)) -
            greatest(${bookings.startAt}, ${period.from}::date)
          )) / 86400)
        ), 0)::numeric(10,2)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          isNull(bookings.deletedAt),
          sql`${bookings.vehicleId} is not null`,
          sql`${bookings.status} in ('dispatched','active','completed')`,
          lt(bookings.startAt, sql`(${period.to}::date + 1)`),
          sql`${bookings.endAt} > ${period.from}::date`
        )
      )
      .groupBy(bookings.vehicleId),

    db
      .select({
        id: vehicles.id,
        registrationNo: vehicles.registrationNo,
        make: vehicles.make,
        model: vehicles.model,
        ownershipType: vehicles.ownershipType,
        investorName: investors.name,
      })
      .from(vehicles)
      .leftJoin(investors, eq(investors.id, vehicles.investorId))
      .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt))),
  ])

  const revenueBy = new Map<string, Money>()
  const costBy = new Map<string, Money>()
  for (const r of ledgerRows) {
    const key = String(r.vehicleId)
    const target = r.direction === 'income' ? revenueBy : costBy
    target.set(key, addMoney(target.get(key) ?? ZERO, money(r.total)))
  }

  const usageBy = new Map<string, { days: number; bookings: number }>()
  for (const b of bookingRows) {
    usageBy.set(String(b.vehicleId), { days: Number(b.days), bookings: b.bookingCount })
  }

  return fleet
    .map((v) => {
      const key = String(v.id)
      const revenue = revenueBy.get(key) ?? ZERO
      const directCosts = costBy.get(key) ?? ZERO
      const usage = usageBy.get(key) ?? { days: 0, bookings: 0 }
      return {
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        make: v.make,
        model: v.model,
        ownershipType: v.ownershipType,
        investorName: v.investorName,
        revenue,
        directCosts,
        net: subtractMoney(revenue, directCosts),
        daysOnRoad: Math.round(usage.days * 100) / 100,
        bookings: usage.bookings,
      }
    })
    .sort((a, b) => Number(b.net) - Number(a.net))
}

export type OperationsToday = {
  departingToday: number
  returningToday: number
  overdue: number
  onRent: number
  available: number
  inMaintenance: number
}

/** What the operator needs to see the moment they open the app. */
export async function getOperationsToday(tenantId: bigint): Promise<OperationsToday> {
  const now = new Date()
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayEnd = new Date(dayStart.getTime() + 86_400_000)

  const [bookingCounts, fleetCounts] = await Promise.all([
    db
      .select({
        departing: sql<number>`count(*) filter (where ${bookings.startAt} >= ${dayStart} and ${bookings.startAt} < ${dayEnd})::int`,
        returning: sql<number>`count(*) filter (where ${bookings.endAt} >= ${dayStart} and ${bookings.endAt} < ${dayEnd})::int`,
        overdue: sql<number>`count(*) filter (where ${bookings.endAt} < ${now} and ${bookings.actualEndAt} is null and ${bookings.status} in ('dispatched','active'))::int`,
      })
      .from(bookings)
      .where(and(eq(bookings.tenantId, tenantId), isNull(bookings.deletedAt))),
    db
      .select({ status: vehicles.status, n: sql<number>`count(*)::int` })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .groupBy(vehicles.status),
  ])

  const byStatus = Object.fromEntries(fleetCounts.map((f) => [f.status, f.n]))
  return {
    departingToday: bookingCounts[0]?.departing ?? 0,
    returningToday: bookingCounts[0]?.returning ?? 0,
    overdue: bookingCounts[0]?.overdue ?? 0,
    onRent: byStatus.on_rent ?? 0,
    available: byStatus.available ?? 0,
    inMaintenance: byStatus.maintenance ?? 0,
  }
}
