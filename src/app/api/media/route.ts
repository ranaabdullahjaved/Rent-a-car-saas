import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
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
    return jsonOk(upload)
  } catch (err) {
    return apiError(err)
  }
}
