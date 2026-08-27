import { pgTable, bigserial, bigint, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ruleKey: text('rule_key').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: bigint('source_id', { mode: 'bigint' }).notNull(),
  recipientType: text('recipient_type').notNull(),
  recipientId: bigint('recipient_id', { mode: 'bigint' }).notNull(),
  recipientAddress: text('recipient_address'),
  channel: text('channel').notNull(), // 'whatsapp' | 'sms' | 'email' | 'in_app'
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  status: text('status').notNull().default('scheduled'),
  title: text('title'),
  body: text('body'),
  payload: jsonb('payload').notNull().default({}),
  providerMessageId: text('provider_message_id'),
  attempts: integer('attempts').notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
