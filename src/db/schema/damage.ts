import { pgTable, bigserial, bigint, text, boolean, numeric, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { vehicles } from './vehicles'
import { bookings } from './bookings'

export const damageRecords = pgTable('damage_records', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id),
  bookingId: bigint('booking_id', { mode: 'bigint' }).references(() => bookings.id),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  incidentAt: timestamp('incident_at', { withTimezone: true }),
  severity: text('severity').notNull().default('minor'),
  atFault: text('at_fault').notNull().default('unknown'),
  description: text('description').notNull(),
  location: text('location'),
  policeReportNo: text('police_report_no'),
  estimatedCost: numeric('estimated_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  actualRepairCost: numeric('actual_repair_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  amountChargedToCustomer: numeric('amount_charged_to_customer', { precision: 14, scale: 2 }).notNull().default('0'),
  amountRecovered: numeric('amount_recovered', { precision: 14, scale: 2 }).notNull().default('0'),
  insuranceClaimed: boolean('insurance_claimed').notNull().default(false),
  insuranceClaimNo: text('insurance_claim_no'),
  insuranceAmountReceived: numeric('insurance_amount_received', { precision: 14, scale: 2 }).notNull().default('0'),
  downtimeDays: numeric('downtime_days', { precision: 6, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('open'),
  repairedAt: timestamp('repaired_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const trafficChallans = pgTable('traffic_challans', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id),
  bookingId: bigint('booking_id', { mode: 'bigint' }).references(() => bookings.id),
  challanNo: text('challan_no'),
  violationType: text('violation_type'),
  violationAt: timestamp('violation_at', { withTimezone: true }).notNull(),
  location: text('location'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  lateSurcharge: numeric('late_surcharge', { precision: 14, scale: 2 }).notNull().default('0'),
  source: text('source').notNull().default('manual'),
  liability: text('liability').notNull().default('customer'),
  amountRecovered: numeric('amount_recovered', { precision: 14, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  evidencePath: text('evidence_path'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DamageRecord = typeof damageRecords.$inferSelect
export type NewDamageRecord = typeof damageRecords.$inferInsert
export type TrafficChallan = typeof trafficChallans.$inferSelect
export type NewTrafficChallan = typeof trafficChallans.$inferInsert
