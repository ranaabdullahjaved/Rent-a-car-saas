import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import * as customerService from '@/lib/modules/customer/customer.service'
import { customerFilterSchema } from '@/lib/modules/customer/customer.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { db } from '@/db/client'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { BookingForm } from '../booking-form'

export const metadata: Metadata = { title: 'New booking' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function NewBookingPage({ searchParams }: PageProps) {
  const { tenantId } = await requireTenantOrRedirect()
  const raw = await searchParams

  // Arriving from the timeline: ?vehicleId and ?date prefill a 10:00-to-10:00
  // next-day booking, the most common shape.
  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null
  const vehicleId = typeof raw.vehicleId === 'string' && /^\d+$/.test(raw.vehicleId) ? raw.vehicleId : undefined
  const initialStart = date ? `${date}T10:00` : undefined
  const initialEnd = date
    ? `${new Date(new Date(date + 'T00:00:00Z').getTime() + 86_400_000).toISOString().slice(0, 10)}T10:00`
    : undefined

  const [customers, [tenant]] = await Promise.all([
    customerService.listCustomers(tenantId, customerFilterSchema.parse({ sort: 'fullName', dir: 'asc' })),
    db
      .select({ defaultBufferMinutes: tenants.defaultBufferMinutes })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1),
  ])

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="New booking"
        description="Check availability, then confirm to reserve the vehicle."
      />
      <BookingForm
        initialBufferMinutes={tenant?.defaultBufferMinutes ?? 0}
        initialVehicleId={vehicleId}
        initialStart={initialStart}
        initialEnd={initialEnd}
        customers={customers.map((c) => ({
          id: String(c.id),
          fullName: c.fullName,
          phone: c.phone,
          riskRating: c.riskRating,
        }))}
      />
    </div>
  )
}
