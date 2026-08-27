import { pgTable, bigserial, bigint, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const investors = pgTable('investors', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  cnic: text('cnic'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  bankName: text('bank_name'),
  bankAccountTitle: text('bank_account_title'),
  bankAccountNo: text('bank_account_no'),
  iban: text('iban'),
  settlementCycle: text('settlement_cycle').notNull().default('monthly'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Investor = typeof investors.$inferSelect
export type NewInvestor = typeof investors.$inferInsert
