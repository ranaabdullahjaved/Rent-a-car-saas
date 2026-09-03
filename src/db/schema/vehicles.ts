import { sql } from 'drizzle-orm'
import { pgTable, bigserial, bigint, text, integer, boolean, numeric, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const vehicles = pgTable('vehicles', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  registrationNo: text('registration_no').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  variant: text('variant'),
  modelYear: integer('model_year'),
  colour: text('colour'),
  chassisNo: text('chassis_no'),
  engineNo: text('engine_no'),
  transmission: text('transmission'),
  fuelType: text('fuel_type'),
  engineCc: integer('engine_cc'),
  seatingCapacity: integer('seating_capacity'),
  tankCapacityLitres: numeric('tank_capacity_litres', { precision: 6, scale: 2 }),
  ownershipType: text('ownership_type').notNull().default('company'),
  investorId: bigint('investor_id', { mode: 'bigint' }),
  purchaseDate: date('purchase_date'),
  purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }),
  isFinanced: boolean('is_financed').notNull().default(false),
  financierName: text('financier_name'),
  monthlyInstalment: numeric('monthly_instalment', { precision: 14, scale: 2 }),
  instalmentsTotal: integer('instalments_total'),
  instalmentsPaid: integer('instalments_paid').notNull().default(0),
  currentOdometer: integer('current_odometer').notNull().default(0),
  status: text('status').notNull().default('available'),
  trackerInstalled: boolean('tracker_installed').notNull().default(false),
  trackerProvider: text('tracker_provider'),
  trackerDeviceId: text('tracker_device_id'),
  primaryPhotoPath: text('primary_photo_path'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  // One registration per tenant. Registrations are stored canonicalised
  // (uppercase, single dashes) so LEA-01-1234 and "lea 01 1234" collide as
  // they should. Partial on deleted_at so a retired vehicle's plate can be
  // reused if the car is re-registered later.
  uniqueIndex('vehicles_tenant_registration_unique')
    .on(t.tenantId, t.registrationNo)
    .where(sql`${t.deletedAt} is null`),
])

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert

/**
 * Reference photos and video captured when the vehicle is registered — what a
 * customer is shown at booking time. Distinct from handover_media, which
 * documents condition at a specific check-out or check-in.
 */
export const vehicleMedia = pgTable('vehicle_media', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: bigint('vehicle_id', { mode: 'bigint' }).notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(), // 'photo' | 'video'
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type VehicleMedia = typeof vehicleMedia.$inferSelect
