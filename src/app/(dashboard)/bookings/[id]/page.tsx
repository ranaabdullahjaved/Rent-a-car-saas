import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { NotFoundError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import { blocksVehicle } from '@/lib/modules/booking/booking.validation'
import { formatPKR, money } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const { tenantId } = await requireTenantOrRedirect()
    const row = await bookingService.getBooking(tenantId, BigInt(id))
    return { title: row.booking.bookingNo }
  } catch {
    return { title: 'Booking' }
  }
}

function when(date: Date | null) {
  return date ? date.toISOString().slice(0, 16).replace('T', ' ') : null
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

export default async function BookingDetailPage({ params }: Props) {
  const { tenantId } = await requireTenantOrRedirect()
  const { id } = await params

  let row
  try {
    row = await bookingService.getBooking(tenantId, BigInt(id))
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const b = row.booking
  const charges = await bookingService.getBookingCharges(tenantId, b.id)
  const overdue = b.endAt < new Date() && !b.actualEndAt && ['dispatched', 'active'].includes(b.status)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={b.bookingNo}
        description={`${row.customerName} · ${row.customerPhone}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/bookings">Back to bookings</Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={b.status} />
        <StatusBadge status={b.paymentStatus} />
        <span className="text-sm text-muted-foreground">{b.bookingType.replace('_', '-')}</span>
      </div>

      {!blocksVehicle(b.status) && b.status !== 'cancelled' && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-medium">This booking is not holding a vehicle</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Only confirmed, dispatched and active bookings reserve a car. Another agent can still
            book this vehicle for these dates.
          </p>
        </div>
      )}

      {overdue && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Overdue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Due back {when(b.endAt)} and not yet checked in.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h2 className="mb-2 text-sm font-medium">Booking</h2>
          <dl className="divide-y">
            <Detail
              label="Vehicle"
              value={
                row.vehicleRegistration ? (
                  <Link
                    href={`/fleet/${b.vehicleId}`}
                    className="underline underline-offset-4"
                  >
                    {row.vehicleRegistration} · {row.vehicleMake} {row.vehicleModel}
                  </Link>
                ) : null
              }
            />
            <Detail
              label="Customer"
              value={
                <Link href={`/customers/${row.customerId}`} className="underline underline-offset-4">
                  {row.customerName}
                </Link>
              }
            />
            <Detail label="Pick-up" value={when(b.startAt)} />
            <Detail label="Return" value={when(b.endAt)} />
            <Detail label="Actual pick-up" value={when(b.actualStartAt)} />
            <Detail label="Actual return" value={when(b.actualEndAt)} />
            <Detail
              label="Turnaround buffer"
              value={b.bufferMinutes ? `${b.bufferMinutes} minutes` : null}
            />
            <Detail label="Notes" value={b.notes} />
          </dl>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-lg border p-5">
            <h2 className="mb-2 text-sm font-medium">Money</h2>
            <dl className="divide-y">
              <Detail label="Daily rate" value={formatPKR(money(b.dailyRate))} />
              <Detail label="Chargeable days" value={b.quotedDays} />
              <Detail label="Estimated total" value={formatPKR(money(b.estimatedTotal))} />
              <Detail label="Charges posted" value={formatPKR(money(b.totalCharges))} />
              <Detail label="Paid" value={formatPKR(money(b.totalPaid))} />
              <Detail
                label="Balance due"
                value={b.balanceDue ? formatPKR(money(b.balanceDue)) : formatPKR(money('0'))}
              />
              <Detail
                label="Security deposit"
                value={formatPKR(money(b.securityDeposit))}
              />
            </dl>
          </section>

          {charges.length > 0 && (
            <section className="rounded-lg border p-5">
              <h2 className="mb-2 text-sm font-medium">Charges</h2>
              <ul className="divide-y text-sm">
                {charges.map((c) => (
                  <li key={String(c.id)} className="flex justify-between gap-4 py-2">
                    <span>
                      {c.chargeType}
                      {c.description ? (
                        <span className="text-muted-foreground"> · {c.description}</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{formatPKR(money(c.amount))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-dashed p-5">
            <h2 className="mb-2 text-sm font-medium">Not built yet</h2>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              <li>Check-out and check-in with photo capture</li>
              <li>Recording payments and payment promises</li>
              <li>Damage, fuel shortfall and challans</li>
              <li>Extending or cancelling from this page</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
