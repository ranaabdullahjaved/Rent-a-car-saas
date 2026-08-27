import { NextRequest, NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import * as paymentService from '@/lib/modules/finance/payment.service'
import { createPaymentSchema } from '@/lib/modules/finance/finance.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const payments = await paymentService.listPayments(tenantId)
    return NextResponse.json({ ok: true, data: payments })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createPaymentSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const payment = await paymentService.recordPayment(tenantId, parsed.data)
    return NextResponse.json({ ok: true, data: payment }, { status: 201 })
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
