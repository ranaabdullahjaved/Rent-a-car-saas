import type { Metadata } from 'next'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { notificationRules, users } from '@/db/schema'
import { PageHeader } from '@/components/shared/page-header'
import { can } from '@/lib/permissions'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { TeamPanel } from './team-panel'
import { AlertsPanel } from './alerts-panel'
import { effectiveRules } from '@/lib/modules/alerts/alert.rules'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const ctx = await requireTenantOrRedirect()
  const manageTeam = can(ctx.role, 'team.manage')

  const storedRules = await db
    .select({
      ruleKey: notificationRules.ruleKey,
      enabled: notificationRules.enabled,
      offsetMinutes: notificationRules.offsetMinutes,
      channels: notificationRules.channels,
    })
    .from(notificationRules)
    .where(eq(notificationRules.tenantId, ctx.tenantId))
  const rules = effectiveRules(storedRules)

  const members = manageTeam
    ? await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(eq(users.tenantId, ctx.tenantId), isNull(users.deletedAt)))
        .orderBy(asc(users.id))
    : []

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Settings" description="Your workspace, team and defaults." />

      <div className="flex max-w-3xl flex-col gap-4">
        {can(ctx.role, 'settings.manage') && (
          <AlertsPanel
            rules={rules.map((r) => ({ key: r.key, enabled: r.enabled, offsetMinutes: r.offsetMinutes }))}
          />
        )}
        {manageTeam ? (
          <TeamPanel
            members={members.map((m) => ({
              id: String(m.id),
              name: m.name,
              email: m.email,
              role: m.role,
              isActive: m.isActive,
              isSelf: String(m.id) === String(ctx.userId),
            }))}
          />
        ) : (
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-medium">Team</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only the owner can manage the team.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
