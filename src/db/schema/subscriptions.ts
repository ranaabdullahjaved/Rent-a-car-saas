import { pgTable, bigserial, bigint, text, boolean, numeric, date, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const plans = pgTable('plans', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  monthlyPrice: numeric('monthly_price', { precision: 14, scale: 2 }).notNull(),
  yearlyPrice: numeric('yearly_price', { precision: 14, scale: 2 }),
  currency: text('currency').notNull().default('PKR'),
  maxVehicles: integer('max_vehicles'),
  maxUsers: integer('max_users'),
  features: jsonb('features').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const subscriptions = pgTable('subscriptions', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  planId: bigint('plan_id', { mode: 'bigint' }).notNull().references(() => plans.id),
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  startsAt: date('starts_at').notNull(),
  currentPeriodEnd: date('current_period_end').notNull(),
  status: text('status').notNull().default('active'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Plan = typeof plans.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
