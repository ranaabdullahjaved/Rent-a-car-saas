import { pgTable, bigserial, bigint, text, boolean, numeric, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const vendors = pgTable('vendors', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  companyName: text('company_name'),
  phone: text('phone').notNull(),
  altPhone: text('alt_phone'),
  city: text('city'),
  address: text('address'),
  vendorType: text('vendor_type').notNull().default('both'),
  trustRating: integer('trust_rating'),
  creditLimit: numeric('credit_limit', { precision: 14, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Vendor = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert
