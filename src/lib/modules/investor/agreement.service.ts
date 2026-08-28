import { and, asc, desc, eq, gte, isNull, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import { investorAgreements, investors, ledgerEntries, vehicles } from '@/db/schema'
import { AppError, NotFoundError, fromDbError, pgErrorCode } from '@/lib/errors'
import { ZERO, addMoney, formatPKR, money, multiplyMoney, subtractMoney, type Money } from '@/lib/money'
import { deductibleCategories, type CreateAgreementInput } from './agreement.validation'

function scope(tenantId: bigint): SQL {
  return and(eq(investorAgreements.tenantId, tenantId), isNull(investorAgreements.deletedAt))!
}

/**
 * Creates an agreement. Overlapping terms for one vehicle are rejected by the
 * no_overlapping_agreement exclusion constraint rather than by a prior read,
 * for the same reason bookings work that way — a check-then-insert races.
 */
export async function createAgreement(tenantId: bigint, input: CreateAgreementInput) {
  try {
    const [row] = await db
      .insert(investorAgreements)
      .values({ ...input, tenantId })
      .returning()
    return row
  } catch (err) {
    if (pgErrorCode(err) === '23P01') {
      throw new AppError(
        'This vehicle already has an agreement covering those dates. End the existing one first, or start this one after it.',
        'OVERLAPPING_AGREEMENT',
        409
      )
    }
    throw fromDbError(err)
  }
}

export async function listAgreements(
  tenantId: bigint,
  filters: { investorId?: bigint; vehicleId?: bigint } = {}
) {
  const conditions: SQL[] = [scope(tenantId)]
  if (filters.investorId) conditions.push(eq(investorAgreements.investorId, filters.investorId))
  if (filters.vehicleId) conditions.push(eq(investorAgreements.vehicleId, filters.vehicleId))

  return db
    .select({
      id: investorAgreements.id,
      investorId: investorAgreements.investorId,
      vehicleId: investorAgreements.vehicleId,
      agreementType: investorAgreements.agreementType,
      sharePercent: investorAgreements.sharePercent,
      fixedMonthlyAmount: investorAgreements.fixedMonthlyAmount,
      settlementCycle: investorAgreements.settlementCycle,
      investorAbsorbsMaintenance: investorAgreements.investorAbsorbsMaintenance,
      investorAbsorbsDamage: investorAgreements.investorAbsorbsDamage,
      investorAbsorbsChallans: investorAgreements.investorAbsorbsChallans,
      effectiveFrom: investorAgreements.effectiveFrom,
      effectiveTo: investorAgreements.effectiveTo,
      investorName: investors.name,
      vehicleRegistration: vehicles.registrationNo,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
    })
    .from(investorAgreements)
    .innerJoin(investors, eq(investors.id, investorAgreements.investorId))
    .innerJoin(vehicles, eq(vehicles.id, investorAgreements.vehicleId))
    .where(and(...conditions))
    .orderBy(desc(investorAgreements.effectiveFrom))
    .limit(200)
}

/** The agreement governing a vehicle on a given date, if any. */
export async function agreementOn(tenantId: bigint, vehicleId: bigint, onDate: string) {
  const [row] = await db
    .select()
    .from(investorAgreements)
    .where(
      and(
        scope(tenantId),
        eq(investorAgreements.vehicleId, vehicleId),
        lte(investorAgreements.effectiveFrom, onDate),
        sql`(${investorAgreements.effectiveTo} is null or ${investorAgreements.effectiveTo} > ${onDate})`
      )
    )
    .limit(1)
  return row
}

export type PayoutLine = {
  vehicleId: bigint
  registrationNo: string
  agreementType: string
  terms: string
  revenue: Money
  deductions: Money
  base: Money
  investorShare: Money
}

export type PayoutStatement = {
  investorId: bigint
  investorName: string
  from: string
  to: string
  lines: PayoutLine[]
  totalRevenue: Money
  totalDeductions: Money
  totalPayable: Money
}

/** Percentage of an amount, kept in decimal arithmetic throughout. */
function share(amount: Money, percent: string): Money {
  return multiplyMoney(amount, (Number(percent) / 100).toFixed(6))
}

/**
 * Works out what an investor is owed for a period.
 *
 * Revenue and costs come from the ledger, which is cash-basis, so this settles
 * on money that actually moved rather than on invoices that may never be paid.
 * Every line shows its working — revenue, deductions, base and share — because
 * a payout an investor cannot check is a payout they will dispute.
 */
export async function buildPayoutStatement(
  tenantId: bigint,
  investorId: bigint,
  from: string,
  to: string
): Promise<PayoutStatement> {
  const [investor] = await db
    .select({ id: investors.id, name: investors.name })
    .from(investors)
    .where(and(eq(investors.tenantId, tenantId), eq(investors.id, investorId)))
    .limit(1)
  if (!investor) throw new NotFoundError('Investor')

  // Agreements that overlap the period at all.
  const agreements = await db
    .select({
      agreement: investorAgreements,
      registrationNo: vehicles.registrationNo,
    })
    .from(investorAgreements)
    .innerJoin(vehicles, eq(vehicles.id, investorAgreements.vehicleId))
    .where(
      and(
        scope(tenantId),
        eq(investorAgreements.investorId, investorId),
        lte(investorAgreements.effectiveFrom, to),
        sql`(${investorAgreements.effectiveTo} is null or ${investorAgreements.effectiveTo} > ${from})`
      )
    )
    .orderBy(asc(vehicles.registrationNo))

  const lines: PayoutLine[] = []
  let totalRevenue: Money = ZERO
  let totalDeductions: Money = ZERO
  let totalPayable: Money = ZERO

  for (const { agreement: a, registrationNo } of agreements) {
    const [revenueRow] = await db
      .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)::text` })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.tenantId, tenantId),
          eq(ledgerEntries.vehicleId, a.vehicleId),
          eq(ledgerEntries.direction, 'income'),
          eq(ledgerEntries.isReversal, false),
          gte(ledgerEntries.entryDate, from),
          lte(ledgerEntries.entryDate, to)
        )
      )

    const revenue = money(revenueRow?.total ?? '0')

    const categories = deductibleCategories(a)
    let deductions: Money = ZERO
    if (categories.length > 0) {
      const [costRow] = await db
        .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)::text` })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.tenantId, tenantId),
            eq(ledgerEntries.vehicleId, a.vehicleId),
            eq(ledgerEntries.direction, 'expense'),
            eq(ledgerEntries.isReversal, false),
            gte(ledgerEntries.entryDate, from),
            lte(ledgerEntries.entryDate, to),
            sql`${ledgerEntries.category} in ${categories}`
          )
        )
      deductions = money(costRow?.total ?? '0')
    }

    let base: Money
    let investorShare: Money
    let terms: string

    switch (a.agreementType) {
      case 'fixed_rent':
        // Performance is irrelevant — the investor is owed the rent whether the
        // car earned anything or not.
        base = ZERO
        investorShare = money(a.fixedMonthlyAmount)
        terms = `${formatPKR(money(a.fixedMonthlyAmount))} per month`
        break
      case 'profit_share':
        base = subtractMoney(revenue, deductions)
        investorShare = share(base, a.sharePercent)
        terms = `${a.sharePercent}% of profit after ${categories.length ? categories.join(', ') : 'no'} costs`
        break
      default:
        base = revenue
        investorShare = share(revenue, a.sharePercent)
        terms = `${a.sharePercent}% of revenue`
    }

    lines.push({
      vehicleId: a.vehicleId,
      registrationNo,
      agreementType: a.agreementType,
      terms,
      revenue,
      deductions,
      base,
      investorShare,
    })

    totalRevenue = addMoney(totalRevenue, revenue)
    totalDeductions = addMoney(totalDeductions, deductions)
    totalPayable = addMoney(totalPayable, investorShare)
  }

  return {
    investorId: investor.id,
    investorName: investor.name,
    from,
    to,
    lines,
    totalRevenue,
    totalDeductions,
    totalPayable,
  }
}
