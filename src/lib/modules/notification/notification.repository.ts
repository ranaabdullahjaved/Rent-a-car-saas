import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { notifications } from '@/db/schema'
import type { NewNotification } from './notification.types'

export async function listNotifications(tenantId: bigint) {
  return db.select().from(notifications).where(eq(notifications.tenantId, tenantId))
}

export async function findNotificationById(tenantId: bigint, id: bigint) {
  const [row] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.id, id)))
    .limit(1)
  return row
}

export async function insertNotification(input: NewNotification) {
  const [row] = await db.insert(notifications).values(input).returning()
  return row
}

export async function markSent(tenantId: bigint, id: bigint, providerMessageId?: string) {
  const [row] = await db
    .update(notifications)
    .set({ status: 'sent', sentAt: new Date(), providerMessageId, updatedAt: new Date() })
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.id, id)))
    .returning()
  return row
}

export async function markFailed(tenantId: bigint, id: bigint, errorMessage: string) {
  const [row] = await db
    .update(notifications)
    .set({ status: 'failed', errorMessage, updatedAt: new Date() })
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.id, id)))
    .returning()
  return row
}
