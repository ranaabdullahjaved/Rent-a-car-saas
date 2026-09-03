import { and, asc, eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { vehicleMedia } from '@/db/schema'
import { apiError, jsonOk } from '@/lib/api'
import { requireCan, requireTenant } from '@/lib/tenant'
import { ValidationError } from '@/lib/errors'
import { requestVehicleUploadUrl, viewUrl } from '@/lib/modules/media/media.service'

/**
 * A vehicle's reference photos and video, each with a one-hour signed view
 * URL. Open to any signed-in member of the tenant — an agent shows these to a
 * customer while taking a booking.
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant()
    const vehicleId = request.nextUrl.searchParams.get('vehicleId')
    if (!vehicleId || !/^\d+$/.test(vehicleId)) throw new ValidationError('vehicleId is required')

    const rows = await db
      .select()
      .from(vehicleMedia)
      .where(and(eq(vehicleMedia.tenantId, tenantId), eq(vehicleMedia.vehicleId, BigInt(vehicleId))))
      .orderBy(asc(vehicleMedia.id))

    const items = await Promise.all(
      rows.map(async (m) => ({
        id: String(m.id),
        mediaType: m.mediaType,
        mimeType: m.mimeType,
        url: await viewUrl(m.filePath),
      }))
    )
    return jsonOk(items)
  } catch (err) {
    return apiError(err)
  }
}

const uploadTicketSchema = z.object({
  batchId: z.string().min(1).max(60),
  fileName: z.string().min(1).max(200),
  contentType: z.string().refine((v) => /^(image|video)\//.test(v), 'Only images and video'),
})

/** Upload slot for vehicle media, requested before the vehicle exists. */
export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await requireTenant()
    requireCan({ role }, 'fleet.manage')

    const parsed = uploadTicketSchema.safeParse(await request.json())
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid upload')

    const safeName = `${Date.now()}-${parsed.data.fileName.replace(/[^\w.-]/g, '_')}`
    const ticket = await requestVehicleUploadUrl(
      tenantId,
      parsed.data.batchId,
      safeName,
      parsed.data.contentType
    )
    return jsonOk(ticket)
  } catch (err) {
    return apiError(err)
  }
}
