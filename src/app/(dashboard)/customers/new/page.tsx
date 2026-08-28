import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { CustomerForm } from '../customer-form'

export const metadata: Metadata = { title: 'Add customer' }

export default async function NewCustomerPage() {
  await requireTenantOrRedirect()

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Add customer"
        description="Capture identity and contact details before handing over a vehicle."
      />
      <CustomerForm />
    </div>
  )
}
