import { apiError, jsonOk } from '@/lib/api'
import { requireTenant } from '@/lib/tenant'
import * as notificationService from '@/lib/modules/notification/notification.service'

export async function GET() {
  try {
    const { tenantId } = await requireTenant()
    const notifications = await notificationService.listNotifications(tenantId)
    return jsonOk(notifications)
  } catch (err) {
    return apiError(err)
  }
}
