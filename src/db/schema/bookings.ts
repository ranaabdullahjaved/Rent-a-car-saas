import { sql } from 'drizzle-orm'
import {
  pgTable, bigserial, bigint, text, numeric, integer,
  boolean, timestamp, customType, uniqueIndex
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { vehicles } from './vehicles'
import { customers } from './customers'
import { employees } from './employees'
import { vendors } from './vendors'

// tstzrange is a PostgreSQL range type — Drizzle doesn't have native support.
// We define it as a custom type that passes through as a string.
export const tstzrange = customType<{ data: string; driverData: string }>({
  dataType() { return 'tstzrange' },
  toDriver(value: string) { return value },
  fromDriver(value: string) { return value },
})

export const bookings = pgTable('bookings', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bookingNo: text('booking_no').notNull(),
  customerId: bigint('customer_id', { mode: 'bigint' }).notNull().references(() => customers.id),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).references(() => vehicles.id),
  driverId: bigint('driver_id', { mode: 'bigint' }).references(() => employees.id),

  bookingType: text('booking_type').notNull().default('self_drive'),
  source: text('source').notNull().default('direct'),

  outsourceDirection: text('outsource_direction'),
  vendorId: bigint('vendor_id', { mode: 'bigint' }).references(() => vendors.id),
  vendorAmount: numeric('vendor_amount', { precision: 14, scale: 2 }).notNull().default('0'),

  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  actualStartAt: timestamp('actual_start_at', { withTimezone: true }),
  actualEndAt: timestamp('actual_end_at', { withTimezone: true }),
  bufferMinutes: integer('buffer_minutes').notNull().default(0),

  // Maintained by BEFORE INSERT/UPDATE trigger — Drizzle reads it, never writes it
  // The GiST exclusion constraint (no_double_booking) uses this column.
  // ADD THE TRIGGER AND CONSTRAINT MANUALLY to the first migration after generation.
  // See: src/db/migrations/README.md for the exact SQL.
  blockRange: tstzrange('block_range'),

  dailyRate: numeric('daily_rate', { precision: 14, scale: 2 }).notNull().default('0'),
  driverChargePerDay: numeric('driver_charge_per_day', { precision: 14, scale: 2 }).notNull().default('0'),
  allowedKmPerDay: integer('allowed_km_per_day'),
  extraKmRate: numeric('extra_km_rate', { precision: 14, scale: 2 }).notNull().default('0'),
  latePenaltyPerHour: numeric('late_penalty_per_hour', { precision: 14, scale: 2 }).notNull().default('0'),
  lateGraceMinutes: integer('late_grace_minutes').notNull().default(60),
  quotedDays: numeric('quoted_days', { precision: 6, scale: 2 }).notNull().default('1'),
  securityDeposit: numeric('security_deposit', { precision: 14, scale: 2 }).notNull().default('0'),
  depositRefunded: numeric('deposit_refunded', { precision: 14, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  estimatedTotal: numeric('estimated_total', { precision: 14, scale: 2 }).notNull().default('0'),

  totalCharges: numeric('total_charges', { precision: 14, scale: 2 }).notNull().default('0'),
  totalPaid: numeric('total_paid', { precision: 14, scale: 2 }).notNull().default('0'),
  // balance_due is a GENERATED ALWAYS AS column in the DB — read only
  balanceDue: numeric('balance_due', { precision: 14, scale: 2 }),

  status: text('status').notNull().default('tentative'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  cancellationReason: text('cancellation_reason'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  // Booking numbers are read out over the phone, so two bookings sharing one
  // is a real operational problem. The number is allocated by reading the
  // current maximum, which two concurrent requests can both read; this is what
  // makes the service's retry loop correct rather than hopeful.
  uniqueIndex('bookings_tenant_booking_no_unique')
    .on(t.tenantId, t.bookingNo)
    .where(sql`${t.deletedAt} is null`),
])

export const bookingCharges = pgTable('booking_charges', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bookingId: bigint('booking_id', { mode: 'bigint' }).notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  chargeType: text('charge_type').notNull(),
  description: text('description'),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitAmount: numeric('unit_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  isWaived: boolean('is_waived').notNull().default(false),
  waivedReason: text('waived_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
export type BookingCharge = typeof bookingCharges.$inferSelect
export type NewBookingCharge = typeof bookingCharges.$inferInsert
