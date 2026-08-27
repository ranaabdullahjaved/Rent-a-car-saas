import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenant, TenantError } from '@/lib/tenant'
import { AppError, ValidationError } from '@/lib/errors'
import { requestUploadUrl } from '@/lib/modules/media/media.service'

const requestUploadSchema = z.object({
  bookingId: z.coerce.bigint(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const parsed = requestUploadSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.message)

    const { bookingId, fileName, contentType } = parsed.data
    const upload = await requestUploadUrl(tenantId, bookingId, fileName, contentType)
    return NextResponse.json({ ok: true, data: upload })
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
