import { sql } from 'drizzle-orm'
import {
  pgTable, bigserial, bigint, text, numeric, boolean, date, timestamp, customType, index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { investors } from './investors'
import { vehicles } from './vehicles'

// daterange, like the tstzrange used for bookings — Drizzle has no native
// range type, so it passes through as a string.
export const daterange = customType<{ data: string; driverData: string }>({
  dataType() { return 'daterange' },
  toDriver(value: string) { return value },
  fromDriver(value: string) { return value },
})

/**
 * The deal struck with an investor over one vehicle.
 *
 * This is a table rather than a percentage on the investor because the terms
 * genuinely differ per car and change over time: revenue share, profit share
 * and fixed monthly rent are different calculations, and who absorbs
 * maintenance or damage changes what "profit" even means. Storing a single
 * number would make historical settlements irreproducible the moment terms
 * were renegotiated.
 */
export const investorAgreements = pgTable('investor_agreements', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  investorId: bigint('investor_id', { mode: 'bigint' }).notNull().references(() => investors.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id, { onDelete: 'cascade' }),

  // 'revenue_share' | 'profit_share' | 'fixed_rent'
  agreementType: text('agreement_type').notNull().default('revenue_share'),
  // Used by revenue_share and profit_share; 0 for fixed_rent.
  sharePercent: numeric('share_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  // Used by fixed_rent; 0 for the share types.
  fixedMonthlyAmount: numeric('fixed_monthly_amount', { precision: 14, scale: 2 }).notNull().default('0'),

  settlementCycle: text('settlement_cycle').notNull().default('monthly'),

  // Which costs come off the top before the investor's share is worked out.
  // These are the terms operators actually argue about, so they are explicit
  // rather than assumed.
  investorAbsorbsMaintenance: boolean('investor_absorbs_maintenance').notNull().default(false),
  investorAbsorbsDamage: boolean('investor_absorbs_damage').notNull().default(false),
  investorAbsorbsChallans: boolean('investor_absorbs_challans').notNull().default(false),

  effectiveFrom: date('effective_from').notNull(),
  // Null means open-ended — the agreement runs until it is superseded.
  effectiveTo: date('effective_to'),

  // Maintained by a BEFORE INSERT/UPDATE trigger, like bookings.block_range.
  // The no_overlapping_agreement exclusion constraint uses this column.
  // ADD THE TRIGGER AND CONSTRAINT MANUALLY to the migration after generation.
  effectiveRange: daterange('effective_range'),

  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('investor_agreements_vehicle_idx').on(t.tenantId, t.vehicleId),
  index('investor_agreements_investor_idx').on(t.tenantId, t.investorId),
])

export type InvestorAgreement = typeof investorAgreements.$inferSelect
export type NewInvestorAgreement = typeof investorAgreements.$inferInsert

// Referenced by the migration README; kept here so the SQL lives next to the
// column it maintains.
export const AGREEMENT_RANGE_SQL = sql`
CREATE OR REPLACE FUNCTION fn_set_agreement_range() RETURNS trigger AS $$
BEGIN
  NEW.effective_range := daterange(NEW.effective_from, NEW.effective_to, '[)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`
