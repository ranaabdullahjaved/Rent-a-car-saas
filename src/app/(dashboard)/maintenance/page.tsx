import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import * as maintenanceService from '@/lib/modules/maintenance/maintenance.service'
import { SERVICE_TYPE_LABELS } from '@/lib/modules/maintenance/maintenance.validation'
import { can } from '@/lib/permissions'
import { formatPKR, money } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { cn } from '@/lib/utils'
import { MaintenanceForms } from './maintenance-forms'

export const metadata: Metadata = { title: 'Maintenance' }

const STATUS_LABELS: Record<string, string> = {
  ok: 'On track',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  unknown: 'No baseline',
}

export default async function MaintenancePage() {
  const { tenantId, role } = await requireTenantOrRedirect()
  const showCosts = can(role, 'reports.view')

  const [fleet, jobs] = await Promise.all([
    maintenanceService.getFleetMaintenance(tenantId),
    maintenanceService.listRecentJobs(tenantId),
  ])

  const overdue = fleet.flatMap((v) => v.schedules).filter((s) => s.prediction.status === 'overdue').length
  const dueSoon = fleet.flatMap((v) => v.schedules).filter((s) => s.prediction.status === 'due_soon').length

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Maintenance"
        description={
          overdue + dueSoon === 0
            ? 'Service schedules, predicted from how far each car actually drives.'
            : `${overdue} overdue · ${dueSoon} due soon`
        }
      />

      <div className="mb-6">
        <MaintenanceForms
          vehicles={fleet.map((v) => ({
            id: String(v.vehicleId),
            registrationNo: v.registrationNo,
            make: v.make,
            model: v.model,
          }))}
          schedules={fleet.flatMap((v) =>
            v.schedules.map((s) => ({
              id: String(s.id),
              vehicleId: String(v.vehicleId),
              label: `${v.registrationNo} · ${SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}`,
            }))
          )}
          canManageFleet={can(role, 'fleet.manage')}
          canRecordCosts={can(role, 'expenses.record')}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {fleet.map((v) => (
          <section key={String(v.vehicleId)} className="animate-enter rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/fleet/${v.vehicleId}`} className="font-medium underline-offset-4 hover:underline">
                  {v.registrationNo}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {v.make} {v.model} · {new Intl.NumberFormat('en-PK').format(v.currentOdometer)} km
                  {v.avgKmPerDay !== null && ` · ~${v.avgKmPerDay} km/day`}
                </p>
              </div>
              <StatusBadge status={v.status} />
            </div>

            {v.schedules.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No service schedule yet.</p>
            ) : (
              <ul className="mt-3 divide-y">
                {v.schedules.map((s) => {
                  const p = s.prediction
                  return (
                    <li key={String(s.id)} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <div className="text-sm">{SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.dueKm !== null && `due at ${new Intl.NumberFormat('en-PK').format(p.dueKm)} km`}
                          {p.dueKm !== null && p.dueDate !== null && ' · '}
                          {p.dueDate !== null && `by ${p.dueDate}`}
                          {p.status !== 'overdue' && p.projectedDaysByKm !== null && ` · ~${p.projectedDaysByKm} days at current pace`}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          p.status === 'overdue' && 'bg-danger-soft text-destructive',
                          p.status === 'due_soon' && 'bg-warning-soft text-warning',
                          p.status === 'ok' && 'bg-success-soft text-success',
                          p.status === 'unknown' && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {STATUS_LABELS[p.status]}
                        {p.status === 'overdue' && p.kmRemaining !== null && p.kmRemaining < 0 && (
                          <> · {new Intl.NumberFormat('en-PK').format(-p.kmRemaining)} km over</>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      {jobs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium">Recent work</h2>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Work</th>
                  <th className="px-4 py-2.5 font-medium">Workshop</th>
                  {showCosts && <th className="px-4 py-2.5 text-right font-medium">Cost</th>}
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={String(j.id)} className="border-t">
                    <td className="px-4 py-2.5 tabular-nums">{j.performedAt}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/fleet/${j.vehicleId}`} className="underline-offset-4 hover:underline">
                        {j.registrationNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {SERVICE_TYPE_LABELS[j.serviceType] ?? j.serviceType}
                      {j.odometer ? (
                        <span className="text-muted-foreground"> · {new Intl.NumberFormat('en-PK').format(j.odometer)} km</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{j.workshopName ?? '—'}</td>
                    {showCosts && (
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatPKR(money(j.total))}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
