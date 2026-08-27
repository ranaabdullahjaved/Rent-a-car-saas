import { pgTable, bigserial, bigint, text, integer, boolean, numeric, date, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { vehicles } from './vehicles'

export const maintenanceSchedules = pgTable('maintenance_schedules', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  serviceType: text('service_type').notNull(),
  intervalKm: integer('interval_km'),
  intervalDays: integer('interval_days'),
  lastServiceKm: integer('last_service_km'),
  lastServiceAt: date('last_service_at'),
  nextDueKm: integer('next_due_km'),
  nextDueAt: date('next_due_at'),
  alertBeforeKm: integer('alert_before_km').notNull().default(500),
  alertBeforeDays: integer('alert_before_days').notNull().default(7),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const maintenanceRecords = pgTable('maintenance_records', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id),
  scheduleId: bigint('schedule_id', { mode: 'bigint' }).references(() => maintenanceSchedules.id),
  serviceType: text('service_type').notNull(),
  maintenanceKind: text('maintenance_kind').notNull().default('scheduled'),
  workshopName: text('workshop_name'),
  odometer: integer('odometer'),
  performedAt: date('performed_at').notNull(),
  labourCost: numeric('labour_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  partsCost: numeric('parts_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  otherCost: numeric('other_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  bornBy: text('born_by').notNull().default('company'),
  investorShare: numeric('investor_share', { precision: 14, scale: 2 }).notNull().default('0'),
  downtimeDays: numeric('downtime_days', { precision: 6, scale: 2 }).notNull().default('0'),
  invoicePath: text('invoice_path'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const fuelLogs = pgTable('fuel_logs', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id),
  bookingId: bigint('booking_id', { mode: 'bigint' }),
  litres: numeric('litres', { precision: 8, scale: 2 }).notNull(),
  ratePerLitre: numeric('rate_per_litre', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  odometer: integer('odometer'),
  stationName: text('station_name'),
  filledAt: timestamp('filled_at', { withTimezone: true }).notNull().defaultNow(),
  paidBy: text('paid_by').notNull().default('company'),
  isReimbursed: boolean('is_reimbursed').notNull().default(false),
  receiptPath: text('receipt_path'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect
export type FuelLog = typeof fuelLogs.$inferSelect
