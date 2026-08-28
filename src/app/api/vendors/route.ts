import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as vendorService from '@/lib/modules/vendor/vendor.service'
import { createVendorSchema, setOutsourcingSchema } from '@/lib/modules/vendor/vendor.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    const what = request.nextUrl.searchParams.get('what') ?? 'vendors'

    if (what === 'outsourcing' || what === 'summary') {
      requireCan({ role }, 'reports.view')
      if (what === 'outsourcing') return jsonOk(await vendorService.getOutsourcingLedger(tenantId))
      return jsonOk(await vendorService.getOutsourcingSummary(tenantId))
    }
    return jsonOk(await vendorService.listVendors(tenantId))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    const body = await request.json()

    if (request.nextUrl.searchParams.get('what') === 'outsourcing') {
      requireCan({ role }, 'bookings.manage')
      const parsed = setOutsourcingSchema.safeParse(body)
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid job')
      return jsonOk(await vendorService.setOutsourcing(tenantId, parsed.data), 200)
    }

    requireCan({ role }, 'fleet.manage')
    const parsed = createVendorSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid vendor')
    return jsonOk(await vendorService.createVendor(tenantId, parsed.data), 201)
  } catch (err) {
    return apiError(err)
  }
}
