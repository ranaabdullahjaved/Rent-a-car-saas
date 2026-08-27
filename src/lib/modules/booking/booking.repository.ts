import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { bookings, bookingCharges } from '@/db/schema'
import type { NewBooking } from './booking.types'

export async function listBookings(tenantId: bigint) {
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), isNull(bookings.deletedAt)))
}

export async function findBookingById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id), isNull(bookings.deletedAt)))
    .limit(1)
  return row
}

export async function createBooking(input: NewBooking) {
  const [row] = await db.insert(bookings).values(input).returning()
  return row
}

export async function updateBooking(tenantId: bigint, id: bigint, input: Partial<NewBooking>) {
  const [row] = await db
    .update(bookings)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id)))
    .returning()
  return row
}

export async function softDeleteBooking(tenantId: bigint, id: bigint) {
  const [row] = await db
    .update(bookings)
    .set({ deletedAt: new Date() })
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id)))
    .returning()
  return row
}

export async function listBookingCharges(tenantId: bigint, bookingId: bigint) {
  return db
    .select()
    .from(bookingCharges)
    .where(and(eq(bookingCharges.tenantId, tenantId), eq(bookingCharges.bookingId, bookingId)))
}
