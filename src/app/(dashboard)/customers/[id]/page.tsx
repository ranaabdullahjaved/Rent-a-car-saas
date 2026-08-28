import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { NotFoundError } from '@/lib/errors'
import * as customerService from '@/lib/modules/customer/customer.service'
import { formatCnic, isLicenceExpired } from '@/lib/modules/customer/customer.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const { tenantId } = await requireTenantOrRedirect()
    const c = await customerService.getCustomer(tenantId, BigInt(id))
    return { title: c.fullName }
  } catch {
    return { title: 'Customer' }
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

export default async function CustomerDetailPage({ params }: Props) {
  const { tenantId } = await requireTenantOrRedirect()
  const { id } = await params

  let c
  try {
    c = await customerService.getCustomer(tenantId, BigInt(id))
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const licenceExpired = isLicenceExpired(c.licenseExpiry)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={c.fullName}
        description={[c.city, c.customerType].filter(Boolean).join(' · ')}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/customers">Back to customers</Link>
            </Button>
            <Button asChild>
              <Link href={`/customers/${id}/edit`}>Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={c.riskRating} />
        <span className="text-sm tabular-nums text-muted-foreground">{c.phone}</span>
        <span className="text-sm text-muted-foreground">
          {c.totalBookings} booking{c.totalBookings === 1 ? '' : 's'}
        </span>
      </div>

      {c.riskRating === 'blacklisted' && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Blacklisted</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.blacklistReason ?? 'No reason recorded.'}
          </p>
        </div>
      )}

      {licenceExpired && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-medium">Driving licence expired</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Expired {c.licenseExpiry}. Do not hand over a self-drive booking without a valid licence.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h2 className="mb-2 text-sm font-medium">Identity and contact</h2>
          <dl className="divide-y">
            <Detail label="CNIC" value={formatCnic(c.cnic)} />
            <Detail label="Father's name" value={c.fatherName} />
            <Detail label="WhatsApp" value={c.whatsapp} />
            <Detail label="Alternate phone" value={c.altPhone} />
            <Detail label="Email" value={c.email} />
            <Detail label="Address" value={c.address} />
          </dl>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-lg border p-5">
            <h2 className="mb-2 text-sm font-medium">Licence and reference</h2>
            <dl className="divide-y">
              <Detail label="Licence number" value={c.licenseNo} />
              <Detail
                label="Licence expiry"
                value={
                  c.licenseExpiry ? (
                    <span className={licenceExpired ? 'text-destructive' : undefined}>
                      {c.licenseExpiry}
                    </span>
                  ) : null
                }
              />
              <Detail label="Reference" value={c.referenceName} />
              <Detail label="Reference phone" value={c.referencePhone} />
            </dl>
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-2 text-sm font-medium">Notes</h2>
            <p className="text-sm text-muted-foreground">
              {c.notes || 'Nothing recorded for this customer.'}
            </p>
          </section>

          <section className="rounded-lg border border-dashed p-5">
            <h2 className="mb-2 text-sm font-medium">Not built yet</h2>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              <li>Booking history and current outstanding balance</li>
              <li>Damage and challan incidents attributed to them</li>
              <li>CNIC and licence images</li>
              <li>Lifetime revenue from this customer</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
