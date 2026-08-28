import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as paymentService from '@/lib/modules/finance/payment.service'
import { listLedgerEntries } from '@/lib/modules/finance/ledger.service'
import { recordPaymentSchema } from '@/lib/modules/finance/finance.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const what = request.nextUrl.searchParams.get('what') ?? 'payments'
    const bookingId = request.nextUrl.searchParams.get('bookingId')

    if (what === 'ledger') {
      return jsonOk(await listLedgerEntries(tenantId))
    }
    if (what === 'receivables') {
      return jsonOk(await paymentService.getReceivables(tenantId))
    }
    return jsonOk(
      await paymentService.listPayments(tenantId, bookingId ? BigInt(bookingId) : undefined)
    )
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = recordPaymentSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid payment')

    const payment = await paymentService.recordPayment(tenantId, parsed.data)
    return jsonOk(payment, 201)
  } catch (err) {
    return apiError(err)
  }
}
