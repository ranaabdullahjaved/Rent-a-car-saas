import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as paymentService from '@/lib/modules/finance/payment.service'
import { createPaymentSchema } from '@/lib/modules/finance/finance.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const payments = await paymentService.listPayments(tenantId)
    return jsonOk(payments)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createPaymentSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const payment = await paymentService.recordPayment(tenantId, parsed.data)
    return jsonOk(payment, 201)
  } catch (err) {
    return apiError(err)
  }
}
