import { pgTable, bigserial, bigint, text, date, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const customers = pgTable('customers', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  fatherName: text('father_name'),
  cnic: text('cnic'),
  phone: text('phone').notNull(),
  altPhone: text('alt_phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  licenseNo: text('license_no'),
  licenseExpiry: date('license_expiry'),
  cnicFrontPath: text('cnic_front_path'),
  cnicBackPath: text('cnic_back_path'),
  licensePath: text('license_path'),
  referenceName: text('reference_name'),
  referencePhone: text('reference_phone'),
  customerType: text('customer_type').notNull().default('individual'),
  riskRating: text('risk_rating').notNull().default('normal'),
  blacklistReason: text('blacklist_reason'),
  totalBookings: integer('total_bookings').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
