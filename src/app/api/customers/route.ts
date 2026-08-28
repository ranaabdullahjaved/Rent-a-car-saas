import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as customerService from '@/lib/modules/customer/customer.service'
import {
  createCustomerSchema,
  customerFilterSchema,
} from '@/lib/modules/customer/customer.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()

    const params = request.nextUrl.searchParams
    const filters = customerFilterSchema.safeParse({
      q: params.get('q') ?? undefined,
      riskRating: params.get('riskRating') ?? undefined,
      customerType: params.get('customerType') ?? undefined,
      sort: params.get('sort') ?? undefined,
      dir: params.get('dir') ?? undefined,
    })
    if (!filters.success) throw new ValidationError(filters.error.issues[0]?.message ?? 'Bad filters')

    const customers = await customerService.listCustomers(tenantId, filters.data)
    return jsonOk(customers)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'customers.manage')
    const parsed = createCustomerSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid customer')

    const customer = await customerService.createCustomer(tenantId, parsed.data)
    return jsonOk(customer, 201)
  } catch (err) {
    return apiError(err)
  }
}
