import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import * as customerService from '@/lib/modules/customer/customer.service'
import {
  customerFilterSchema,
  formatCnic,
  isLicenceExpired,
} from '@/lib/modules/customer/customer.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { CustomerFilters } from './customer-filters'

export const metadata: Metadata = { title: 'Customers' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const str = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined)

export default async function CustomersPage({ searchParams }: PageProps) {
  const { tenantId } = await requireTenantOrRedirect()
  const raw = await searchParams

  const filters = customerFilterSchema.parse({
    q: str(raw.q),
    riskRating: str(raw.riskRating),
    customerType: str(raw.customerType),
    sort: str(raw.sort),
    dir: str(raw.dir),
  })

  const [rows, summary] = await Promise.all([
    customerService.listCustomers(tenantId, filters),
    customerService.getCustomerSummary(tenantId),
  ])

  const isFiltered = Boolean(filters.q || filters.riskRating || filters.customerType)
  const blacklisted = summary.byRisk.blacklisted ?? 0

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Customers"
        description={
          summary.total === 0
            ? 'No customers yet.'
            : `${summary.total} customer${summary.total === 1 ? '' : 's'}${blacklisted ? ` · ${blacklisted} blacklisted` : ''}`
        }
        actions={
          <Button asChild>
            <Link href="/customers/new">Add customer</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <CustomerFilters />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">CNIC</th>
              <th className="px-4 py-2.5 font-medium">Rating</th>
              <th className="px-4 py-2.5 text-right font-medium">Bookings</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {isFiltered ? (
                    <>
                      No customers match these filters.{' '}
                      <Link href="/customers" className="underline underline-offset-4">
                        Clear them
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      No customers yet.{' '}
                      <Link href="/customers/new" className="underline underline-offset-4">
                        Add your first customer
                      </Link>
                      .
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={String(c.id)} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/customers/${c.id}`} className="underline-offset-4 hover:underline">
                      {c.fullName}
                    </Link>
                    {c.city ? <span className="text-muted-foreground"> · {c.city}</span> : null}
                    {isLicenceExpired(c.licenseExpiry) && (
                      <span className="ml-2 text-xs text-destructive">licence expired</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{c.phone}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {formatCnic(c.cnic) ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.riskRating} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.totalBookings}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
