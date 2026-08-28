import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { NotFoundError } from '@/lib/errors'
import * as fleetService from '@/lib/modules/fleet/fleet.service'
import { requireTenantOrRedirect } from '@/lib/tenant'
import { VehicleForm } from '../../vehicle-form'

export const metadata: Metadata = { title: 'Edit vehicle' }

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
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
  const investors = await fleetService.listInvestorOptions(tenantId)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={`Edit ${v.registrationNo}`} description={`${v.make} ${v.model}`} />
      <VehicleForm
        investors={investors.map((i) => ({ id: String(i.id), name: i.name }))}
        initial={{
          id: String(v.id),
          registrationNo: v.registrationNo,
          make: v.make,
          model: v.model,
          variant: v.variant,
          modelYear: v.modelYear,
          colour: v.colour,
          chassisNo: v.chassisNo,
          engineNo: v.engineNo,
          transmission: v.transmission,
          fuelType: v.fuelType,
          engineCc: v.engineCc,
          seatingCapacity: v.seatingCapacity,
          ownershipType: v.ownershipType,
          investorId: v.investorId ? String(v.investorId) : null,
          currentOdometer: v.currentOdometer,
          status: v.status,
          notes: v.notes,
        }}
      />
    </div>
  )
}
