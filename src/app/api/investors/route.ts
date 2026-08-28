import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as investorService from '@/lib/modules/investor/investor.service'
import * as agreementService from '@/lib/modules/investor/agreement.service'
import { createInvestorSchema } from '@/lib/modules/investor/investor.validation'
import {
  createAgreementSchema,
  payoutPeriodSchema,
} from '@/lib/modules/investor/agreement.validation'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const params = request.nextUrl.searchParams
    const what = params.get('what') ?? 'investors'

    if (what === 'agreements') {
      return jsonOk(
        await agreementService.listAgreements(tenantId, {
          investorId: params.get('investorId') ? BigInt(params.get('investorId')!) : undefined,
          vehicleId: params.get('vehicleId') ? BigInt(params.get('vehicleId')!) : undefined,
        })
      )
    }

    if (what === 'payout') {
      const parsed = payoutPeriodSchema.safeParse({
        investorId: params.get('investorId') ?? undefined,
        from: params.get('from') ?? undefined,
        to: params.get('to') ?? undefined,
      })
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid period')

      return jsonOk(
        await agreementService.buildPayoutStatement(
          tenantId,
          parsed.data.investorId,
          parsed.data.from,
          parsed.data.to
        )
      )
    }

    return jsonOk(await investorService.listInvestors(tenantId))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const body = await request.json()

    if (request.nextUrl.searchParams.get('what') === 'agreement') {
      const parsed = createAgreementSchema.safeParse(body)
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid agreement')
      return jsonOk(await agreementService.createAgreement(tenantId, parsed.data), 201)
    }

    const parsed = createInvestorSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid investor')
    return jsonOk(await investorService.createInvestor(tenantId, parsed.data), 201)
  } catch (err) {
    return apiError(err)
  }
}
