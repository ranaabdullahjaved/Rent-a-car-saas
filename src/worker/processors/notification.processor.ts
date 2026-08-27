import * as notificationRepository from '@/lib/modules/notification/notification.repository'
import { dispatchNotification } from '@/lib/modules/notification/notification.service'
import type { NotificationJob } from '../queues'

export async function processNotificationJob(data: NotificationJob) {
  const notification = await notificationRepository.findNotificationById(
    data.tenantId,
    data.notificationId
  )
  if (!notification || !notification.recipientAddress) return

  await dispatchNotification(
    data.tenantId,
    notification.id,
    data.channel,
    notification.recipientAddress,
    notification.title ?? '',
    notification.body ?? ''
  )
}
