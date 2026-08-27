import * as notificationRepository from './notification.repository'
import { sendWhatsApp } from './channels/whatsapp'
import { sendSms } from './channels/sms'
import { sendEmail } from './channels/email'
import type { NotificationChannel } from './notification.types'

export async function listNotifications(tenantId: bigint) {
  return notificationRepository.listNotifications(tenantId)
}

// Called by the worker's notification processor — actually dispatches
// through the right channel and records the outcome.
export async function dispatchNotification(
  tenantId: bigint,
  id: bigint,
  channel: NotificationChannel,
  recipientAddress: string,
  title: string,
  body: string
) {
  try {
    let messageId = ''
    if (channel === 'whatsapp') {
      messageId = (await sendWhatsApp(recipientAddress, body)).messageId
    } else if (channel === 'sms') {
      messageId = (await sendSms(recipientAddress, body)).messageId
    } else if (channel === 'email') {
      messageId = (await sendEmail(recipientAddress, title, body)).messageId
    }
    return notificationRepository.markSent(tenantId, id, messageId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return notificationRepository.markFailed(tenantId, id, message)
  }
}
