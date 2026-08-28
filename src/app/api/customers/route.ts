import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as customerService from '@/lib/modules/customer/customer.service'
import { createCustomerSchema } from '@/lib/modules/customer/customer.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const customers = await customerService.listCustomers(tenantId)
    return jsonOk(customers)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createCustomerSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const customer = await customerService.createCustomer(tenantId, parsed.data)
    return jsonOk(customer, 201)
  } catch (err) {
    return apiError(err)
  }
}
