import { pgTable, bigserial, bigint, text, boolean, numeric, date, timestamp, integer } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { bookings } from './bookings'
import { investors } from './investors'
import { vendors } from './vendors'
import { employees } from './employees'

export const payments = pgTable('payments', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  direction: text('direction').notNull(), // 'in' | 'out'
  partyType: text('party_type').notNull(),
  partyId: bigint('party_id', { mode: 'bigint' }),
  bookingId: bigint('booking_id', { mode: 'bigint' }).references(() => bookings.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  method: text('method').notNull().default('cash'),
  referenceNo: text('reference_no'),
  purpose: text('purpose').notNull().default('booking'),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  receiptPath: text('receipt_path'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const paymentPromises = pgTable('payment_promises', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bookingId: bigint('booking_id', { mode: 'bigint' }).references(() => bookings.id, { onDelete: 'cascade' }),
  customerId: bigint('customer_id', { mode: 'bigint' }).notNull(),
  promisedAmount: numeric('promised_amount', { precision: 14, scale: 2 }).notNull(),
  promisedDate: date('promised_date').notNull(),
  amountCollected: numeric('amount_collected', { precision: 14, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('pending'),
  followupCount: integer('followup_count').notNull().default(0),
  lastFollowupAt: timestamp('last_followup_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }),
  employeeId: bigint('employee_id', { mode: 'bigint' }).references(() => employees.id),
  bookingId: bigint('booking_id', { mode: 'bigint' }).references(() => bookings.id),
  vendorId: bigint('vendor_id', { mode: 'bigint' }).references(() => vendors.id),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  expenseDate: date('expense_date').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  paidTo: text('paid_to'),
  description: text('description'),
  receiptPath: text('receipt_path'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const investorPayouts = pgTable('investor_payouts', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  investorId: bigint('investor_id', { mode: 'bigint' }).notNull().references(() => investors.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  grossRevenue: numeric('gross_revenue', { precision: 14, scale: 2 }).notNull().default('0'),
  totalDeductions: numeric('total_deductions', { precision: 14, scale: 2 }).notNull().default('0'),
  investorShare: numeric('investor_share', { precision: 14, scale: 2 }).notNull().default('0'),
  companyShare: numeric('company_share', { precision: 14, scale: 2 }).notNull().default('0'),
  netPayable: numeric('net_payable', { precision: 14, scale: 2 }).notNull().default('0'),
  amountPaid: numeric('amount_paid', { precision: 14, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('draft'),
  statementPdfPath: text('statement_pdf_path'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
export type InvestorPayout = typeof investorPayouts.$inferSelect
