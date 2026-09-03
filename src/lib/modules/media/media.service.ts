import { getPresignedUploadUrl, getPresignedViewUrl, getPublicUrl, buildMediaKey } from './r2.client'

export async function requestUploadUrl(tenantId: bigint, bookingId: bigint, fileName: string, contentType: string) {
  const key = buildMediaKey(tenantId.toString(), bookingId.toString(), fileName)
  const uploadUrl = await getPresignedUploadUrl(key, contentType)
  return { key, uploadUrl, publicUrl: getPublicUrl(key) }
}

/**
 * Upload slot for a vehicle's reference photos and video. The vehicle may not
 * exist yet (the form uploads before it is saved), so the key is grouped by
 * tenant and a client-supplied batch id rather than the vehicle id — the key
 * is only a name, and the vehicle_media row created on save is what binds it.
 */
export async function requestVehicleUploadUrl(
  tenantId: bigint,
  batchId: string,
  fileName: string,
  contentType: string
) {
  const safeBatch = batchId.replace(/[^\w-]/g, '').slice(0, 40) || 'batch'
  const key = `tenants/${tenantId}/vehicle-media/${safeBatch}/${fileName}`
  const uploadUrl = await getPresignedUploadUrl(key, contentType)
  return { key, uploadUrl }
}

/**
 * A short-lived signed GET for viewing a stored object.
 *
 * Used instead of R2_PUBLIC_URL because the bucket is private — which is the
 * right default for customer documents and handover evidence — and because it
 * works without any bucket-level public access being configured.
 */
export async function viewUrl(key: string, expiresIn = 3600): Promise<string> {
  return getPresignedViewUrl(key, expiresIn)
}
