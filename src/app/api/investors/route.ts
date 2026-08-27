import { NextRequest, NextResponse } from 'next/server'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import * as investorService from '@/lib/modules/investor/investor.service'
import { createInvestorSchema } from '@/lib/modules/investor/investor.validation'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const investors = await investorService.listInvestors(tenantId)
    return NextResponse.json({ ok: true, data: investors })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = createInvestorSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const investor = await investorService.createInvestor(tenantId, parsed.data)
    return NextResponse.json({ ok: true, data: investor }, { status: 201 })
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
