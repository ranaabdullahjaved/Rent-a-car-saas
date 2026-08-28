import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { NotFoundError } from '@/lib/errors'
import * as bookingService from '@/lib/modules/booking/booking.service'
import * as paymentService from '@/lib/modules/finance/payment.service'
import * as incidentService from '@/lib/modules/incident/incident.service'
import * as handoverService from '@/lib/modules/handover/handover.service'
import { ANGLE_LABELS, fuelLabel } from '@/lib/modules/handover/handover.validation'
import { challanTotal, damageNetImpact } from '@/lib/modules/incident/incident.validation'
import { blocksVehicle } from '@/lib/modules/booking/booking.validation'
import { formatPKR, money } from '@/lib/money'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { MoneyPanel } from './money-panel'
import { IncidentPanel } from './incident-panel'
import { HandoverPanel } from './handover-panel'

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
  const [charges, bookingPayments, promises, damages, challans, blockers, handovers, assessment] =
    await Promise.all([
    bookingService.getBookingCharges(tenantId, b.id),
    paymentService.listPayments(tenantId, b.id),
    paymentService.listPromises(tenantId, b.id),
    incidentService.listDamage(tenantId, { bookingId: b.id }),
    incidentService.listChallans(tenantId, { bookingId: b.id }),
    incidentService.getClosureBlockers(tenantId, b.id),
    handoverService.listHandovers(tenantId, b.id),
    handoverService.getReturnAssessment(tenantId, b.id),
  ])
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

      {blockers.length > 0 && b.status !== 'cancelled' && (
        <div className="mb-6 rounded-lg border p-4">
          <p className="text-sm font-medium">Cannot be closed yet</p>
          <ul className="mt-2 flex flex-col gap-1">
            {blockers.map((reason) => (
              <li key={reason} className="text-sm text-muted-foreground">
                • {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
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
          <section className="rounded-xl border bg-card p-5 shadow-sm">
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
            <section className="rounded-xl border bg-card p-5 shadow-sm">
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

          {bookingPayments.length > 0 && (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-medium">Payments received</h2>
              <ul className="divide-y text-sm">
                {bookingPayments.map((p) => (
                  <li key={String(p.id)} className="flex justify-between gap-4 py-2">
                    <span>
                      {p.paidAt.toISOString().slice(0, 10)}
                      <span className="text-muted-foreground">
                        {' · '}
                        {p.method.replace('_', ' ')}
                        {p.purpose !== 'booking' ? ` · ${p.purpose.replace(/_/g, ' ')}` : ''}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatPKR(money(p.amount))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {promises.length > 0 && (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-medium">Promises to pay</h2>
              <ul className="divide-y text-sm">
                {promises.map((pr) => (
                  <li key={String(pr.id)} className="flex justify-between gap-4 py-2">
                    <span>
                      {pr.promisedDate}
                      <span className="text-muted-foreground"> · {pr.status}</span>
                    </span>
                    <span className="tabular-nums">{formatPKR(money(pr.promisedAmount))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {damages.length > 0 && (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-medium">Damage</h2>
              <ul className="divide-y text-sm">
                {damages.map((d) => {
                  const net = damageNetImpact(d.actualRepairCost, d.amountChargedToCustomer)
                  const gain = !net.startsWith('-')
                  return (
                    <li key={String(d.id)} className="py-2">
                      <div className="flex justify-between gap-4">
                        <span>{d.description}</span>
                        <span className={gain ? 'tabular-nums' : 'tabular-nums text-destructive'}>
                          {gain ? '+' : ''}
                          {formatPKR(money(net))}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        repair {formatPKR(money(d.actualRepairCost))} · charged{' '}
                        {formatPKR(money(d.amountChargedToCustomer))} · {d.severity.replace('_', ' ')} ·{' '}
                        {d.status.replace('_', ' ')}
                        {Number(d.downtimeDays) > 0 ? ` · ${d.downtimeDays} days off road` : ''}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {challans.length > 0 && (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-medium">Traffic challans</h2>
              <ul className="divide-y text-sm">
                {challans.map((c) => (
                  <li key={String(c.id)} className="flex justify-between gap-4 py-2">
                    <span>
                      {c.violationType ?? 'Violation'}
                      <span className="block text-xs text-muted-foreground">
                        {c.violationAt.toISOString().slice(0, 10)} · {c.liability} liable · {c.status}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {formatPKR(challanTotal(c.amount, c.lateSurcharge))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-dashed p-5">
            <h2 className="mb-2 text-sm font-medium">Not built yet</h2>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              <li>Damage, fuel shortfall and challans</li>
              <li>Extending or cancelling from this page</li>
            </ul>
          </section>
        </div>
      </div>

      {handovers.length > 0 && (
        <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">Handovers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {handovers.map((h) => (
              <div key={String(h.id)} className="rounded-lg border bg-background p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">
                    {h.handoverType === 'checkout' ? 'Checked out' : 'Checked in'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.performedAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <dl className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <dt>Odometer</dt>
                    <dd className="tabular-nums text-foreground">{h.odometer} km</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Fuel</dt>
                    <dd className="text-foreground">{fuelLabel(h.fuelLevelEighths)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Photos</dt>
                    <dd className="text-foreground">{h.media.length}</dd>
                  </div>
                </dl>
                {h.media.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {h.media.map((m) => ANGLE_LABELS[m.angle] ?? m.angle).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>

          {assessment && (
            <div className="mt-4 rounded-md border bg-muted/40 p-4">
              <p className="text-sm font-medium">Proposed on return</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nothing is charged automatically — add whichever of these apply from the money panel.
              </p>
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Driven</dt>
                  <dd className="tabular-nums">{assessment.kilometresDriven} km</dd>
                </div>
                {assessment.extraKilometres > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Extra kilometres · {assessment.extraKilometres} km</dt>
                    <dd className="tabular-nums">{formatPKR(assessment.extraKmCharge)}</dd>
                  </div>
                )}
                {assessment.fuelShortfallEighths > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Fuel short · {assessment.fuelShortfallEighths}/8 of a tank</dt>
                    <dd className="tabular-nums">{formatPKR(assessment.fuelCharge)}</dd>
                  </div>
                )}
                {assessment.hoursLate > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Late · {assessment.hoursLate} hour{assessment.hoursLate === 1 ? '' : 's'}</dt>
                    <dd className="tabular-nums">{formatPKR(assessment.lateCharge)}</dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between gap-3 border-t pt-2 font-medium">
                  <dt>Suggested total</dt>
                  <dd className="tabular-nums">{formatPKR(assessment.total)}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HandoverPanel
          bookingId={id}
          hasVehicle={Boolean(b.vehicleId)}
          stage={
            handovers.some((h) => h.handoverType === 'checkin')
              ? 'done'
              : handovers.some((h) => h.handoverType === 'checkout')
                ? 'checkin'
                : 'checkout'
          }
        />
        <MoneyPanel bookingId={id} balanceDue={b.balanceDue ?? '0'} />
        <IncidentPanel bookingId={id} vehicleId={b.vehicleId ? String(b.vehicleId) : null} />
      </div>
    </div>
  )
}
