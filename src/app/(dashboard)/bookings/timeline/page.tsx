import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import * as bookingRepository from '@/lib/modules/booking/booking.repository'
import { blocksVehicle } from '@/lib/modules/booking/booking.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Timeline' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const DAY_MS = 86_400_000
const WINDOW_DAYS = 21

function startOfUTCDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

export default async function TimelinePage({ searchParams }: PageProps) {
  const { tenantId } = await requireTenantOrRedirect()
  const raw = await searchParams

  const fromParam = typeof raw.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.from) ? raw.from : null
  // Default window starts two days back, so this morning's returns are visible.
  const windowStart = fromParam
    ? new Date(fromParam + 'T00:00:00Z')
    : new Date(startOfUTCDay(new Date()).getTime() - 2 * DAY_MS)
  const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * DAY_MS)

  const { fleet, spans } = await bookingRepository.listBookingsForTimeline(
    tenantId,
    windowStart,
    windowEnd
  )

  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => new Date(windowStart.getTime() + i * DAY_MS))
  const today = startOfUTCDay(new Date()).getTime()
  const windowMs = WINDOW_DAYS * DAY_MS

  const prev = iso(new Date(windowStart.getTime() - 7 * DAY_MS))
  const next = iso(new Date(windowStart.getTime() + 7 * DAY_MS))

  /** Position a span as percentages of the window, clipped to its edges. */
  function place(startAt: Date, endAt: Date, bufferMinutes: number) {
    const s = Math.max(startAt.getTime(), windowStart.getTime())
    const e = Math.min(endAt.getTime() + bufferMinutes * 60_000, windowEnd.getTime())
    if (e <= s) return null
    return {
      left: ((s - windowStart.getTime()) / windowMs) * 100,
      width: ((e - s) / windowMs) * 100,
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Timeline"
        description={`${iso(windowStart)} to ${iso(new Date(windowEnd.getTime() - DAY_MS))} · every car, every booking`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/bookings">List view</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Earlier">
              <Link href={`/bookings/timeline?from=${prev}`}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/bookings/timeline">Today</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Later">
              <Link href={`/bookings/timeline?from=${next}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/bookings/new">New booking</Link>
            </Button>
          </>
        }
      />

      {fleet.length === 0 ? (
        <div className="animate-enter rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          No vehicles yet.{' '}
          <Link href="/fleet/new" className="text-primary underline underline-offset-4">
            Add your first vehicle
          </Link>{' '}
          and it will appear here.
        </div>
      ) : (
        <div className="animate-enter overflow-x-auto rounded-xl border bg-card shadow-sm">
          <div className="min-w-[900px]">
            {/* Day header */}
            <div className="flex border-b bg-muted/60">
              <div className="w-44 shrink-0 border-r px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vehicle
              </div>
              <div className="relative flex flex-1">
                {days.map((d) => {
                  const isToday = d.getTime() === today
                  const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        'flex-1 border-r py-1.5 text-center leading-tight last:border-r-0',
                        isWeekend && 'bg-muted/50',
                        isToday && 'bg-primary/10'
                      )}
                    >
                      <div className={cn('text-[10px] uppercase text-muted-foreground', isToday && 'font-semibold text-primary')}>
                        {d.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })}
                      </div>
                      <div className={cn('text-xs tabular-nums', isToday && 'font-semibold text-primary')}>
                        {d.getUTCDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* One row per vehicle */}
            {fleet.map((v) => {
              const vehicleSpans = spans.filter((s) => String(s.vehicleId) === String(v.id))
              const offRoad = v.status === 'maintenance' || v.status === 'damaged'
              return (
                <div key={String(v.id)} className="group flex border-b last:border-b-0">
                  <div className="w-44 shrink-0 border-r px-3 py-2.5">
                    <Link
                      href={`/fleet/${v.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {v.registrationNo}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {v.make} {v.model}
                    </div>
                    {offRoad && (
                      <div className="mt-1">
                        <StatusBadge status={v.status} />
                      </div>
                    )}
                  </div>

                  <div className="relative min-h-14 flex-1">
                    {/* Day grid + click-to-book */}
                    <div className="absolute inset-0 flex">
                      {days.map((d) => {
                        const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
                        const isToday = d.getTime() === today
                        return (
                          <Link
                            key={d.toISOString()}
                            href={`/bookings/new?vehicleId=${v.id}&date=${iso(d)}`}
                            aria-label={`Book ${v.registrationNo} on ${iso(d)}`}
                            className={cn(
                              'flex-1 border-r transition-colors last:border-r-0 hover:bg-primary/10',
                              isWeekend && 'bg-muted/40',
                              isToday && 'bg-primary/5'
                            )}
                          />
                        )
                      })}
                    </div>

                    {/* Booking spans */}
                    {vehicleSpans.map((s) => {
                      const pos = place(s.startAt, s.endAt, s.bufferMinutes)
                      if (!pos) return null
                      const holds = blocksVehicle(s.status)
                      const finished = s.status === 'completed'
                      return (
                        <Link
                          key={String(s.id)}
                          href={`/bookings/${s.id}`}
                          title={`${s.bookingNo} · ${s.customerName} · ${s.status}`}
                          className={cn(
                            'absolute top-1/2 z-10 flex h-8 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[11px] font-medium shadow-sm transition-transform hover:z-20 hover:scale-[1.02]',
                            finished
                              ? 'bg-muted text-muted-foreground'
                              : holds
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-dashed border-warning bg-warning-soft text-warning'
                          )}
                          style={{ left: `${pos.left}%`, width: `max(${pos.width}%, 3.5%)` }}
                        >
                          <span className="truncate">{s.customerName}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-sm bg-primary" /> holds the car
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-sm border border-dashed border-warning bg-warning-soft" />{' '}
          tentative — does not hold it
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-sm bg-muted" /> completed
        </span>
        <span>Click an empty day to start a booking for that car.</span>
      </div>
    </div>
  )
}
