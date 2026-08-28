import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { VehicleForm } from '../vehicle-form'

export const metadata: Metadata = { title: 'Add vehicle' }

export default async function NewVehiclePage() {
  const { tenantId } = await requireTenantOrRedirect()
  const investors = await fleetService.listInvestorOptions(tenantId)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Add vehicle"
        description="Register a car so bookings, costs and earnings can attach to it."
      />
      <VehicleForm investors={investors.map((i) => ({ id: String(i.id), name: i.name }))} />
    </div>
  )
}
