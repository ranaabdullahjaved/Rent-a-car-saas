import { NextRequest } from 'next/server'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import * as investorService from '@/lib/modules/investor/investor.service'
import { createInvestorSchema } from '@/lib/modules/investor/investor.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const investors = await investorService.listInvestors(tenantId)
    return jsonOk(investors)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createInvestorSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const investor = await investorService.createInvestor(tenantId, parsed.data)
    return jsonOk(investor, 201)
  } catch (err) {
    return apiError(err)
  }
}
