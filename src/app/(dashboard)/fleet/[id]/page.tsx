import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { NotFoundError } from '@/lib/errors'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { requireTenantOrRedirect } from '@/lib/tenant'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const { tenantId } = await requireTenantOrRedirect()
    const row = await fleetService.getVehicle(tenantId, BigInt(id))
    return { title: row.vehicle.registrationNo }
  } catch {
    return { title: 'Vehicle' }
  }
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

export default async function VehicleDetailPage({ params }: Props) {
  const { tenantId } = await requireTenantOrRedirect()
  const { id } = await params

  let row
  try {
    row = await fleetService.getVehicle(tenantId, BigInt(id))
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const v = row.vehicle
  const km = new Intl.NumberFormat('en-PK').format(v.currentOdometer)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={v.registrationNo}
        description={`${v.make} ${v.model}${v.variant ? ` ${v.variant}` : ''}${v.modelYear ? ` · ${v.modelYear}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/fleet">Back to fleet</Link>
            </Button>
            <Button asChild>
              <Link href={`/fleet/${id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={v.status} />
        <span className="text-sm text-muted-foreground">
          {v.ownershipType === 'investor'
            ? `Investor-owned · ${row.investorName ?? 'unassigned'}`
            : `${v.ownershipType}-owned`}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">{km} km</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium">Specification</h2>
          <dl className="divide-y">
            <Detail label="Colour" value={v.colour} />
            <Detail label="Transmission" value={v.transmission} />
            <Detail label="Fuel type" value={v.fuelType} />
            <Detail label="Engine" value={v.engineCc ? `${v.engineCc} cc` : null} />
            <Detail label="Seats" value={v.seatingCapacity} />
            <Detail label="Chassis number" value={v.chassisNo} />
            <Detail label="Engine number" value={v.engineNo} />
          </dl>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-medium">Notes</h2>
            <p className="text-sm text-muted-foreground">
              {v.notes || 'Nothing recorded for this vehicle.'}
            </p>
          </section>

          {/* These become real tabs as bookings, maintenance, damage and the
              ledger land. Naming them now so the page reads honestly rather
              than pretending the data is missing. */}
          <section className="rounded-lg border border-dashed p-5">
            <h2 className="mb-2 text-sm font-medium">Not built yet</h2>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              <li>Booking history and upcoming bookings</li>
              <li>Maintenance schedule and service records</li>
              <li>Damage and challan history</li>
              <li>Lifetime revenue, cost and profit from the ledger</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
