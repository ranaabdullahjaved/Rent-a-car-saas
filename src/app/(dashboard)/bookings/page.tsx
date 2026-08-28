import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import * as bookingService from '@/lib/modules/booking/booking.service'
import { bookingFilterSchema, blocksVehicle } from '@/lib/modules/booking/booking.validation'
import { formatPKR, money } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Bookings' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }
const str = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined)

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'departing', label: 'Departing' },
  { key: 'returning', label: 'Returning' },
  { key: 'overdue', label: 'Overdue' },
] as const

function when(date: Date) {
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const { tenantId } = await requireTenantOrRedirect()
  const raw = await searchParams

  const filters = bookingFilterSchema.parse({
    q: str(raw.q),
    status: str(raw.status),
    view: str(raw.view),
    sort: str(raw.sort),
    dir: str(raw.dir),
  })

  const [rows, summary] = await Promise.all([
    bookingService.listBookings(tenantId, filters),
    bookingService.getSummary(tenantId),
  ])

  const now = new Date()

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Bookings"
        description={
          summary.total === 0
            ? 'No bookings yet.'
            : `${summary.total} booking${summary.total === 1 ? '' : 's'}${summary.overdue ? ` · ${summary.overdue} overdue` : ''}`
        }
        actions={
          <Button asChild>
            <Link href="/bookings/new">New booking</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === 'all' ? '/bookings' : `/bookings?view=${v.key}`}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm',
              filters.view === v.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {v.label}
            {v.key === 'overdue' && summary.overdue > 0 ? ` (${summary.overdue})` : ''}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Booking</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Vehicle</th>
              <th className="px-4 py-2.5 font-medium">Dates</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {filters.view === 'all' ? (
                    <>
                      No bookings yet.{' '}
                      <Link href="/bookings/new" className="underline underline-offset-4">
                        Take your first booking
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Nothing in this view.{' '}
                      <Link href="/bookings" className="underline underline-offset-4">
                        See all bookings
                      </Link>
                      .
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((b) => {
                const overdue =
                  b.endAt < now && !b.actualEndAt && ['dispatched', 'active'].includes(b.status)
                return (
                  <tr key={String(b.id)} className="border-t hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium">
                      <Link href={`/bookings/${b.id}`} className="underline-offset-4 hover:underline">
                        {b.bookingNo}
                      </Link>
                      {!blocksVehicle(b.status) && b.status !== 'cancelled' && (
                        <span className="ml-2 text-xs text-muted-foreground">not holding a car</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {b.customerName}
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {b.customerPhone}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {b.vehicleRegistration ? (
                        <>
                          {b.vehicleRegistration}
                          <span className="block text-xs text-muted-foreground">
                            {b.vehicleMake} {b.vehicleModel}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {when(b.startAt)}
                      <span
                        className={cn(
                          'block text-xs',
                          overdue ? 'text-destructive' : 'text-muted-foreground'
                        )}
                      >
                        → {when(b.endAt)}
                        {overdue ? ' · overdue' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatPKR(money(b.estimatedTotal))}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
