import { pgTable, bigserial, bigint, text, boolean, numeric, date, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const employees = pgTable('employees', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: bigint('tenant_id', { mode: 'bigint' }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fatherName: text('father_name'),
  cnic: text('cnic'),
  phone: text('phone').notNull(),
  address: text('address'),
  employeeType: text('employee_type').notNull(),
  designation: text('designation'),
  joinedOn: date('joined_on'),
  leftOn: date('left_on'),
  salaryType: text('salary_type').notNull().default('monthly'),
  baseSalary: numeric('base_salary', { precision: 14, scale: 2 }).notNull().default('0'),
  perTripAllowance: numeric('per_trip_allowance', { precision: 14, scale: 2 }).notNull().default('0'),
  licenseNo: text('license_no'),
  licenseExpiry: date('license_expiry'),
  licensePath: text('license_path'),
  cnicPath: text('cnic_path'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert
