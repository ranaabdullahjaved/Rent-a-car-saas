import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { NotFoundError } from '@/lib/errors'
import * as customerService from '@/lib/modules/customer/customer.service'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { CustomerForm } from '../../customer-form'

export const metadata: Metadata = { title: 'Edit customer' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireTenantOrRedirect()
  const { id } = await params

  let c
  try {
    c = await customerService.getCustomer(tenantId, BigInt(id))
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={`Edit ${c.fullName}`} description={c.phone} />
      <CustomerForm
        initial={{
          id: String(c.id),
          fullName: c.fullName,
          fatherName: c.fatherName,
          cnic: c.cnic,
          phone: c.phone,
          altPhone: c.altPhone,
          whatsapp: c.whatsapp,
          email: c.email,
          address: c.address,
          city: c.city,
          licenseNo: c.licenseNo,
          licenseExpiry: c.licenseExpiry,
          referenceName: c.referenceName,
          referencePhone: c.referencePhone,
          customerType: c.customerType,
          riskRating: c.riskRating,
          blacklistReason: c.blacklistReason,
          notes: c.notes,
        }}
      />
    </div>
  )
}
