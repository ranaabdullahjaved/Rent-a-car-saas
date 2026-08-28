import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { fleetFilterSchema } from '@/lib/modules/fleet/fleet.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { FleetFilters } from './fleet-filters'

export const metadata: Metadata = { title: 'Fleet' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function formatKm(value: number) {
  return `${new Intl.NumberFormat('en-PK').format(value)} km`
}

export default async function FleetPage({ searchParams }: PageProps) {
  const { tenantId } = await requireTenantOrRedirect()

  // Unparseable filters fall back to defaults rather than erroring — a bad
  // URL should not break the page.
  const raw = await searchParams
  const filters = fleetFilterSchema.parse({
    q: typeof raw.q === 'string' ? raw.q : undefined,
    status: typeof raw.status === 'string' && raw.status ? raw.status : undefined,
    ownershipType:
      typeof raw.ownershipType === 'string' && raw.ownershipType ? raw.ownershipType : undefined,
    sort: typeof raw.sort === 'string' && raw.sort ? raw.sort : undefined,
    dir: typeof raw.dir === 'string' && raw.dir ? raw.dir : undefined,
  })

  const [rows, summary] = await Promise.all([
    fleetService.listVehicles(tenantId, filters),
    fleetService.getFleetSummary(tenantId),
  ])

  const isFiltered = Boolean(filters.q || filters.status || filters.ownershipType)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Fleet"
        description={
          summary.total === 0
            ? 'No vehicles yet.'
            : `${summary.total} vehicle${summary.total === 1 ? '' : 's'} · ${summary.byStatus.available ?? 0} available · ${summary.byStatus.on_rent ?? 0} on rent`
        }
        actions={
          <Button asChild>
            <Link href="/fleet/new">Add vehicle</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <FleetFilters />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Registration</th>
              <th className="px-4 py-2.5 font-medium">Vehicle</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-4 py-2.5 text-right font-medium">Odometer</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {isFiltered ? (
                    <>
                      No vehicles match these filters.{' '}
                      <Link href="/fleet" className="underline underline-offset-4">
                        Clear them
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Your fleet is empty.{' '}
                      <Link href="/fleet/new" className="underline underline-offset-4">
                        Add your first vehicle
                      </Link>
                      .
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={String(v.id)} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/fleet/${v.id}`} className="underline-offset-4 hover:underline">
                      {v.registrationNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {v.make} {v.model}
                    {v.variant ? ` ${v.variant}` : ''}
                    {v.modelYear ? (
                      <span className="text-muted-foreground"> · {v.modelYear}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {v.ownershipType === 'investor'
                      ? (v.investorName ?? 'Investor')
                      : v.ownershipType}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatKm(v.currentOdometer)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length === 200 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing the first 200 vehicles. Narrow the filters to see more.
        </p>
      )}
    </div>
  )
}
