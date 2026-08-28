import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import * as reportService from '@/lib/modules/report/report.service'
import {
  changeVersus,
  fleetUtilisation,
  monthToDate,
  previousPeriod,
  type Period,
} from '@/lib/modules/report/report.periods'
import { formatPKR } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-muted" />
      ))}
    </div>
  )
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Delta({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="text-xs text-muted-foreground">no prior period</span>
  }
  const up = change >= 0
  return (
    <span className={cn('text-xs', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
      {up ? '▲' : '▼'} {Math.abs(change)}% vs previous
    </span>
  )
}

/* ---------- widgets, each fetching its own data ---------- */

async function CashPosition({ tenantId, period }: { tenantId: bigint; period: Period }) {
  const [current, prior] = await Promise.all([
    reportService.getCashPosition(tenantId, period),
    reportService.getCashPosition(tenantId, previousPeriod(period)),
  ])

  const stats = [
    { label: 'Money in', value: current.income, change: changeVersus(current.income, prior.income) },
    { label: 'Money out', value: current.expense, change: changeVersus(current.expense, prior.expense) },
    { label: 'Net', value: current.net, change: changeVersus(current.net, prior.net) },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="mt-1 text-xl font-medium tabular-nums">{formatPKR(s.value)}</div>
          <div className="mt-0.5">
            <Delta change={s.change} />
          </div>
        </div>
      ))}
    </div>
  )
}

async function Operations({ tenantId }: { tenantId: bigint }) {
  const ops = await reportService.getOperationsToday(tenantId)
  const items = [
    { label: 'Departing today', value: ops.departingToday, href: '/bookings?view=departing' },
    { label: 'Returning today', value: ops.returningToday, href: '/bookings?view=returning' },
    { label: 'Overdue', value: ops.overdue, href: '/bookings?view=overdue', alert: ops.overdue > 0 },
    { label: 'On rent', value: ops.onRent, href: '/fleet?status=on_rent' },
    { label: 'Available', value: ops.available, href: '/fleet?status=available' },
    { label: 'In workshop', value: ops.inMaintenance, href: '/fleet?status=maintenance' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          className={cn(
            'rounded-md border px-3 py-2 transition-colors hover:bg-muted/50',
            i.alert && 'border-destructive/40 bg-destructive/5'
          )}
        >
          <div className="text-xs text-muted-foreground">{i.label}</div>
          <div
            className={cn('text-lg font-medium tabular-nums', i.alert && 'text-destructive')}
          >
            {i.value}
          </div>
        </Link>
      ))}
    </div>
  )
}

async function VehicleProfitability({ tenantId, period }: { tenantId: bigint; period: Period }) {
  const rows = await reportService.getVehicleProfitability(tenantId, period)
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No vehicles yet.{' '}
        <Link href="/fleet/new" className="underline underline-offset-4">
          Add one
        </Link>
        .
      </p>
    )
  }

  const utilisation = fleetUtilisation(rows, period)

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        Fleet utilisation {utilisation}% — days earning against days available.
      </p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Vehicle</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 text-right font-medium">Days out</th>
              <th className="px-3 py-2 text-right font-medium">Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Costs</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const loss = r.net.startsWith('-')
              return (
                <tr key={String(r.vehicleId)} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/fleet/${r.vehicleId}`} className="underline-offset-4 hover:underline">
                      {r.registrationNo}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {r.make} {r.model}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.investorName ?? r.ownershipType}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.daysOnRoad}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPKR(r.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatPKR(r.directCosts)}
                  </td>
                  <td className={cn('px-3 py-2 text-right font-medium tabular-nums', loss && 'text-destructive')}>
                    {formatPKR(r.net)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Costs shown are those attributed to a specific vehicle. Office overheads are excluded rather
        than spread across the fleet, so each figure is money traceable to that car alone.
      </p>
    </>
  )
}

/* ---------- page ---------- */

export default async function DashboardPage({ searchParams }: PageProps) {
  const { tenantId, role } = await requireTenantOrRedirect()
  const showMoney = can(role, 'reports.view')
  const raw = await searchParams

  const fallback = monthToDate()
  const period: Period = {
    from: isDate(raw.from) ? raw.from : fallback.from,
    to: isDate(raw.to) ? raw.to : fallback.to,
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        description={`${period.from} to ${period.to}`}
        actions={
          <form className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              name="from"
              defaultValue={period.from}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              name="to"
              defaultValue={period.to}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted"
            >
              Apply
            </button>
          </form>
        }
      />

      {/* Each widget streams independently, so one slow query cannot hold up
          the rest of the page. */}
      <div className="flex flex-col gap-4">
        {showMoney && (
          <Suspense fallback={<Skeleton rows={4} />}>
            <CashPosition tenantId={tenantId} period={period} />
          </Suspense>
        )}

        <Panel title="Today" hint="What needs attention right now">
          <Suspense fallback={<Skeleton rows={3} />}>
            <Operations tenantId={tenantId} />
          </Suspense>
        </Panel>

        {showMoney && (
          <Panel title="Profit per vehicle" hint="Which cars earn, and which cost you">
            <Suspense fallback={<Skeleton rows={5} />}>
              <VehicleProfitability tenantId={tenantId} period={period} />
            </Suspense>
          </Panel>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Not built yet: month-on-month and year-on-year charts, investor earnings summary, and
        drill-down from a figure to the ledger rows behind it.
      </p>
    </div>
  )
}
