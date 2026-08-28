import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import * as customerService from '@/lib/modules/customer/customer.service'
import { customerFilterSchema } from '@/lib/modules/customer/customer.validation'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { BookingForm } from '../booking-form'

export const metadata: Metadata = { title: 'New booking' }

export default async function NewBookingPage() {
  const { tenantId } = await requireTenantOrRedirect()

  const customers = await customerService.listCustomers(
    tenantId,
    customerFilterSchema.parse({ sort: 'fullName', dir: 'asc' })
  )

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="New booking"
        description="Check availability, then confirm to reserve the vehicle."
      />
      <BookingForm
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
