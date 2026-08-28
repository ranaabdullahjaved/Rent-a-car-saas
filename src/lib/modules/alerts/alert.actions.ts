'use server'

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { notificationRules } from '@/db/schema'
import { AppError } from '@/lib/errors'
import { requireCan, requireTenant } from '@/lib/tenant'
import { RULE_KEYS, type RuleKey } from './alert.rules'

export type AlertActionResult = { ok: true } | { ok: false; message: string }

export async function updateRuleAction(
  key: RuleKey,
  enabled: boolean,
  offsetMinutes: number
): Promise<AlertActionResult> {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'settings.manage')

    if (!RULE_KEYS.includes(key)) return { ok: false, message: 'Unknown alert.' }
    if (!Number.isInteger(offsetMinutes) || offsetMinutes < 0 || offsetMinutes > 14 * 24 * 60) {
      return { ok: false, message: 'The lead time must be between 0 and 14 days.' }
    }

    await db
      .insert(notificationRules)
      .values({
        tenantId,
        ruleKey: key,
        enabled: String(enabled),
        offsetMinutes,
      })
      .onConflictDoUpdate({
        target: [notificationRules.tenantId, notificationRules.ruleKey],
        set: {
          enabled: String(enabled),
          offsetMinutes,
          updatedAt: sql`now()`,
        },
      })

    revalidatePath('/settings')
    return { ok: true }
  } catch (err) {
    if (err instanceof AppError) return { ok: false, message: err.message }
    console.error('alert rule update failed', err)
    return { ok: false, message: 'Could not save the alert setting.' }
  }
}

