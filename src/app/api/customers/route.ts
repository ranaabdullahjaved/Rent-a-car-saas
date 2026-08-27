import { NextRequest, NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import * as customerService from '@/lib/modules/customer/customer.service'
import { createCustomerSchema } from '@/lib/modules/customer/customer.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const customers = await customerService.listCustomers(tenantId)
    return NextResponse.json({ ok: true, data: customers })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createCustomerSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const customer = await customerService.createCustomer(tenantId, parsed.data)
    return NextResponse.json({ ok: true, data: customer }, { status: 201 })
  } catch (err) {
    return errorResponse(err)
  }
}

function errorResponse(err: unknown) {
  if (err instanceof TenantError) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHENTICATED', message: err.message } },
      { status: 401 }
    )
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message } },
      { status: err.statusCode }
    )
  }
  throw err
}
