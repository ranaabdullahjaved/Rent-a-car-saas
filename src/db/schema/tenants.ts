import { pgTable, bigserial, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerName: text('owner_name'),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  countryCode: text('country_code').notNull().default('PK'),
  timezone: text('timezone').notNull().default('Asia/Karachi'),
  currency: text('currency').notNull().default('PKR'),
  locale: text('locale').notNull().default('en'),
  status: text('status').notNull().default('trial'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  defaultBufferMinutes: integer('default_buffer_minutes').notNull().default(0),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
