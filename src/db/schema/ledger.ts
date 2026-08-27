import { pgTable, bigserial, bigint, text, boolean, numeric, date, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

// The unified ledger is the single source of truth for every financial report.
// Every rupee that moves through the system writes ONE row here.
// Reports are GROUP BY queries on this table — nothing else.
export const ledgerEntries = pgTable('ledger_entries', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  direction: text('direction').notNull(), // 'income' | 'expense'
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }),
  bookingId: bigint('booking_id', { mode: 'bigint' }),
  investorId: bigint('investor_id', { mode: 'bigint' }),
  vendorId: bigint('vendor_id', { mode: 'bigint' }),
  customerId: bigint('customer_id', { mode: 'bigint' }),
  employeeId: bigint('employee_id', { mode: 'bigint' }),
  sourceType: text('source_type').notNull(),
  sourceId: bigint('source_id', { mode: 'bigint' }).notNull(),
  isCash: boolean('is_cash').notNull().default(true),
  isReversal: boolean('is_reversal').notNull().default(false),
  reversesId: bigint('reverses_id', { mode: 'bigint' }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert
