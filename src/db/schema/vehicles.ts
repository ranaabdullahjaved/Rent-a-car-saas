import { pgTable, bigserial, bigint, text, integer, boolean, numeric, timestamp, date } from 'drizzle-orm/pg-core'
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
})

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
