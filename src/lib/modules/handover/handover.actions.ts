'use server'

import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/errors'
import { requireTenant } from '@/lib/tenant'
import { requestUploadUrl } from '../media/media.service'
import * as handoverService from './handover.service'
import { recordHandoverSchema, uploadRequestSchema } from './handover.validation'

export type HandoverActionResult =
  | { ok: true; handoverId?: string }
  | { ok: false; message: string }

export type UploadTicket =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; message: string }

function formToObject(form: FormData) {
  return Object.fromEntries(
    Array.from(form.entries()).filter(([key]) => !key.startsWith('$')) as [string, string][]
  )
}

function failure(err: unknown): HandoverActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('handover action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

/**
 * Hands the browser a short-lived signed URL so it can PUT straight to R2.
 *
 * The file never passes through this app: Vercel caps a serverless request
 * body at 4.5 MB, and a walkaround video will exceed that. Proxying it would
 * work locally and fail in production.
 */
export async function requestUploadTicket(input: unknown): Promise<UploadTicket> {
  try {
    const { tenantId } = await requireTenant()
    const parsed = uploadRequestSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'That file cannot be attached.' }
    }

    const safeName = `${parsed.data.angle}-${Date.now()}-${parsed.data.fileName.replace(/[^\w.-]/g, '_')}`
    const { key, uploadUrl } = await requestUploadUrl(
      tenantId,
      parsed.data.bookingId,
      safeName,
      parsed.data.contentType
    )
    return { ok: true, key, uploadUrl }
  } catch (err) {
    console.error('upload ticket failed', err)
    return { ok: false, message: 'Could not prepare the upload.' }
  }
}

export async function recordHandoverAction(form: FormData): Promise<HandoverActionResult> {
  try {
    const { tenantId } = await requireTenant()
    const parsed = recordHandoverSchema.safeParse(formToObject(form))
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }

    const handover = await handoverService.recordHandover(tenantId, parsed.data)

    // Attach anything the browser already uploaded to R2 for this handover.
    const uploaded = form.get('uploadedMedia')
    if (typeof uploaded === 'string' && uploaded.trim()) {
      for (const entry of uploaded.split('|').filter(Boolean)) {
        const [angle, filePath, mediaType, mimeType] = entry.split('::')
        if (!angle || !filePath) continue
        await handoverService.attachMedia(tenantId, handover!.id, {
          angle,
          filePath,
          mediaType: mediaType ?? 'photo',
          mimeType: mimeType ?? 'image/jpeg',
        })
      }
    }

    revalidatePath(`/bookings/${parsed.data.bookingId}`)
    revalidatePath('/bookings')
    revalidatePath('/fleet')
    revalidatePath('/')
    return { ok: true, handoverId: String(handover!.id) }
  } catch (err) {
    return failure(err)
  }
}
