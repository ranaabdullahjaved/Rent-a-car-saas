import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { db } from '@/db/client'
import { notifications, tenants } from '@/db/schema'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { sweepTenant } from '@/lib/modules/alerts/alert.engine'

const SWEEP_THROTTLE_MS = 10 * 60_000

/** The in-app inbox: sent in_app rows, newest first, plus the unread count. */
export async function GET() {
  try {
    const { tenantId } = await requireTenant()

    const [rows, [unread]] = await Promise.all([
      db
        .select({
          id: notifications.id,
          ruleKey: notifications.ruleKey,
          title: notifications.title,
          body: notifications.body,
          sentAt: notifications.sentAt,
          readAt: notifications.readAt,
          sourceType: notifications.sourceType,
          sourceId: notifications.sourceId,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.channel, 'in_app'),
            eq(notifications.status, 'sent')
          )
        )
        .orderBy(desc(notifications.sentAt))
        .limit(30),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.channel, 'in_app'),
            eq(notifications.status, 'sent'),
            isNull(notifications.readAt)
          )
        ),
    ])

    return jsonOk({ items: rows, unread: unread?.n ?? 0 })
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const action = request.nextUrl.searchParams.get('action') ?? 'read'

    if (action === 'sweep') {
      // Anyone with the app open keeps their tenant's alerts fresh, throttled
      // through the tenant row so concurrent serverless instances agree.
      const [t] = await db
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)
      const last = Number((t?.settings as Record<string, unknown>)?.lastAlertSweep ?? 0)
      if (Date.now() - last < SWEEP_THROTTLE_MS) {
        return jsonOk({ swept: false })
      }
      await db
        .update(tenants)
        .set({
          settings: sql`${tenants.settings} || jsonb_build_object('lastAlertSweep', ${Date.now()}::bigint)`,
        })
        .where(eq(tenants.id, tenantId))
      const result = await sweepTenant(tenantId)
      return jsonOk({ swept: true, ...result })
    }

    // Mark the whole inbox read — opening the bell acknowledges it.
    await db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.channel, 'in_app'),
          eq(notifications.status, 'sent'),
          isNull(notifications.readAt)
        )
      )
    return jsonOk({ ok: true })
  } catch (err) {
    return apiError(err)
  }
}
