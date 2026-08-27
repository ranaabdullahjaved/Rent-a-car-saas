import { getPresignedUploadUrl, getPublicUrl, buildMediaKey } from './r2.client'

export async function requestUploadUrl(tenantId: bigint, bookingId: bigint, fileName: string, contentType: string) {
  const key = buildMediaKey(tenantId.toString(), bookingId.toString(), fileName)
  const uploadUrl = await getPresignedUploadUrl(key, contentType)
  return { key, uploadUrl, publicUrl: getPublicUrl(key) }
}
