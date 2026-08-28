import { and, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  bookings,
  customers,
  notificationRules,
  notifications,
  paymentPromises,
  tenants,
  users,
  vehicles,
} from '@/db/schema'
import { getFleetMaintenance } from '../maintenance/maintenance.service'
import { dispatchNotification } from '../notification/notification.service'
import { SERVICE_TYPE_LABELS } from '../maintenance/maintenance.validation'
import { effectiveRules, type EffectiveRule } from './alert.rules'

const MIN = 60_000

type Candidate = {
  ruleKey: string
  sourceType: string
  sourceId: bigint
  scheduledFor: Date
  title: string
  body: string
}

/**
 * One sweep for one tenant: work out what should fire, insert the rows, send
 * what is due. Safe to run as often as anything likes — the dedup index on
 * (rule, source, channel, moment) makes a repeat insert a no-op, and dispatch
 * only touches rows still marked scheduled.
 */
export async function sweepTenant(tenantId: bigint): Promise<{ created: number; sent: number }> {
  const stored = await db
    .select({
      ruleKey: notificationRules.ruleKey,
      enabled: notificationRules.enabled,
      offsetMinutes: notificationRules.offsetMinutes,
      channels: notificationRules.channels,
    })
    .from(notificationRules)
    .where(eq(notificationRules.tenantId, tenantId))

  const rules = effectiveRules(stored)
  const now = new Date()
  const candidates: Candidate[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue
    if (rule.key === 'booking_reminder') candidates.push(...(await bookingReminders(tenantId, rule, now)))
    if (rule.key === 'return_due') candidates.push(...(await returnsDue(tenantId, rule, now)))
    if (rule.key === 'maintenance_due') candidates.push(...(await maintenanceDue(tenantId, now)))
    if (rule.key === 'payment_promise') candidates.push(...(await promisesDue(tenantId, now)))
  }

  // Fan each candidate out to the rule's channels and insert. The unique
  // index absorbs anything already scheduled.
  let created = 0
  for (const c of candidates) {
    const rule = rules.find((r) => r.key === c.ruleKey)!
    for (const channel of rule.channels) {
      const inserted = await db
        .insert(notifications)
        .values({
          tenantId,
          ruleKey: c.ruleKey,
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          recipientType: 'tenant',
          recipientId: tenantId,
          channel,
          scheduledFor: c.scheduledFor,
          title: c.title,
          body: c.body,
          status: 'scheduled',
        })
        .onConflictDoNothing()
        .returning({ id: notifications.id })
      created += inserted.length
    }
  }

  const sent = await dispatchDue(tenantId, now)
  return { created, sent }
}

/** Sends every scheduled notification whose moment has arrived. */
async function dispatchDue(tenantId: bigint, now: Date): Promise<number> {
  const due = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.status, 'scheduled'),
        lte(notifications.scheduledFor, now),
        sql`${notifications.attempts} < 5`
      )
    )
    .limit(100)

  if (due.length === 0) return 0

  // Email goes to the workspace owner; in-app rows are the inbox itself.
  const [owner] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'owner'), eq(users.isActive, true)))
    .orderBy(users.id)
    .limit(1)

  let sent = 0
  for (const n of due) {
    if (n.channel === 'in_app') {
      await db
        .update(notifications)
        .set({ status: 'sent', sentAt: now, updatedAt: now })
        .where(eq(notifications.id, n.id))
      sent++
      continue
    }

    const address =
      n.recipientAddress ?? (n.channel === 'email' ? (owner?.email ?? null) : null)

    if (!address) {
      // WhatsApp/SMS with no configured recipient, or no owner email: park it
      // rather than burn attempts. It stays visible as scheduled.
      continue
    }

    await dispatchNotification(
      tenantId,
      n.id,
      n.channel as 'email' | 'whatsapp' | 'sms',
      address,
      n.title ?? 'RentFlow',
      n.body ?? ''
    )
    sent++
  }
  return sent
}

/* ---------- candidate finders ---------- */

async function bookingReminders(tenantId: bigint, rule: EffectiveRule, now: Date): Promise<Candidate[]> {
  // Bookings starting within the lead window that have not yet started.
  const horizon = new Date(now.getTime() + rule.offsetMinutes * MIN)
  const rows = await db
    .select({
      id: bookings.id,
      bookingNo: bookings.bookingNo,
      startAt: bookings.startAt,
      customerName: customers.fullName,
      registrationNo: vehicles.registrationNo,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .leftJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        isNull(bookings.deletedAt),
        eq(bookings.status, 'confirmed'),
        gte(bookings.startAt, now),
        lte(bookings.startAt, horizon)
      )
    )

  return rows.map((b) => ({
    ruleKey: 'booking_reminder',
    sourceType: 'booking',
    sourceId: b.id,
    // Fires at the offset before pick-up; if the sweep first sees it inside
    // the window, it goes out on the next dispatch immediately.
    scheduledFor: new Date(b.startAt.getTime() - rule.offsetMinutes * MIN),
    title: `Booking ${b.bookingNo} coming up`,
    body: `${b.customerName} picks up ${b.registrationNo ?? 'a car (unassigned)'} at ${b.startAt.toISOString().slice(0, 16).replace('T', ' ')}. Time to arrange the vehicle.`,
  }))
}

async function returnsDue(tenantId: bigint, rule: EffectiveRule, now: Date): Promise<Candidate[]> {
  const horizon = new Date(now.getTime() + rule.offsetMinutes * MIN)
  const rows = await db
    .select({
      id: bookings.id,
      bookingNo: bookings.bookingNo,
      endAt: bookings.endAt,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      registrationNo: vehicles.registrationNo,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .leftJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        isNull(bookings.deletedAt),
        inArray(bookings.status, ['dispatched', 'active']),
        isNull(bookings.actualEndAt),
        lte(bookings.endAt, horizon)
      )
    )

  return rows.map((b) => {
    const overdue = b.endAt <= now
    return {
      ruleKey: 'return_due',
      sourceType: 'booking',
      sourceId: b.id,
      scheduledFor: overdue ? b.endAt : new Date(b.endAt.getTime() - rule.offsetMinutes * MIN),
      title: overdue ? `${b.registrationNo ?? 'A car'} is overdue` : `${b.registrationNo ?? 'A car'} due back soon`,
      body: `${b.bookingNo} · ${b.customerName} (${b.customerPhone}) — due ${b.endAt.toISOString().slice(0, 16).replace('T', ' ')}.${overdue ? ' Not yet checked in.' : ''}`,
    }
  })
}

async function maintenanceDue(tenantId: bigint, now: Date): Promise<Candidate[]> {
  const fleet = await getFleetMaintenance(tenantId)
  const today = now.toISOString().slice(0, 10)
  const out: Candidate[] = []

  for (const v of fleet) {
    for (const s of v.schedules) {
      const p = s.prediction
      if (p.status !== 'due_soon' && p.status !== 'overdue') continue
      out.push({
        ruleKey: 'maintenance_due',
        sourceType: 'maintenance_schedule',
        sourceId: s.id,
        // One per schedule per day: the dedup key includes scheduledFor, so
        // an unresolved service re-alerts daily rather than once ever.
        scheduledFor: new Date(today + 'T00:00:00Z'),
        title:
          p.status === 'overdue'
            ? `${v.registrationNo} service overdue`
            : `${v.registrationNo} service due soon`,
        body: `${SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType} — ${
          p.kmRemaining !== null
            ? p.kmRemaining <= 0
              ? `${-p.kmRemaining} km past the interval`
              : `${p.kmRemaining} km remaining`
            : `due ${p.dueDate}`
        }. Odometer ${v.currentOdometer} km.`,
      })
    }
  }
  return out
}

async function promisesDue(tenantId: bigint, now: Date): Promise<Candidate[]> {
  const today = now.toISOString().slice(0, 10)
  const rows = await db
    .select({
      id: paymentPromises.id,
      promisedDate: paymentPromises.promisedDate,
      promisedAmount: paymentPromises.promisedAmount,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      bookingNo: bookings.bookingNo,
    })
    .from(paymentPromises)
    .innerJoin(customers, eq(customers.id, paymentPromises.customerId))
    .leftJoin(bookings, eq(bookings.id, paymentPromises.bookingId))
    .where(
      and(
        eq(paymentPromises.tenantId, tenantId),
        eq(paymentPromises.status, 'pending'),
        lte(paymentPromises.promisedDate, today)
      )
    )

  return rows.map((p) => ({
    ruleKey: 'payment_promise',
    sourceType: 'payment_promise',
    sourceId: p.id,
    scheduledFor: new Date(today + 'T00:00:00Z'),
    title: `Collect from ${p.customerName} today`,
    body: `${p.customerName} (${p.customerPhone}) promised ${p.promisedAmount} ${p.bookingNo ? `against ${p.bookingNo}` : ''} by ${p.promisedDate}.`,
  }))
}

/** Sweeps every active tenant — the entry point for cron and the worker. */
export async function sweepAllTenants(): Promise<{ tenants: number; created: number; sent: number }> {
  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(isNull(tenants.deletedAt))

  let created = 0
  let sent = 0
  for (const t of rows) {
    const r = await sweepTenant(t.id)
    created += r.created
    sent += r.sent
  }
  return { tenants: rows.length, created, sent }
}
