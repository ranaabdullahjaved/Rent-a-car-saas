import { pgTable, bigserial, bigint, text, integer, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { bookings } from './bookings'
import { vehicles } from './vehicles'

export const vehicleHandovers = pgTable('vehicle_handovers', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bookingId: bigint('booking_id', { mode: 'bigint' }).notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id),
  handoverType: text('handover_type').notNull(), // 'checkout' | 'checkin'
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
  odometer: integer('odometer').notNull(),
  fuelLevelEighths: integer('fuel_level_eighths'),
  fuelLevelLitres: numeric('fuel_level_litres', { precision: 6, scale: 2 }),
  exteriorCondition: text('exterior_condition'),
  interiorCondition: text('interior_condition'),
  accessories: jsonb('accessories').notNull().default({}),
  checklist: jsonb('checklist').notNull().default({}),
  location: text('location'),
  customerSignaturePath: text('customer_signature_path'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const handoverMedia = pgTable('handover_media', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  handoverId: bigint('handover_id', { mode: 'bigint' }).notNull().references(() => vehicleHandovers.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(), // 'photo' | 'video'
  angle: text('angle').notNull(),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  mimeType: text('mime_type'),
  sizeBytes: bigint('size_bytes', { mode: 'bigint' }),
  durationSecs: integer('duration_secs'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type VehicleHandover = typeof vehicleHandovers.$inferSelect
export type NewVehicleHandover = typeof vehicleHandovers.$inferInsert
