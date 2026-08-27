import { Queue } from 'bullmq'
import IORedis from 'ioredis'

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not set')
}

export const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
})

export const notificationQueue = new Queue('notifications', { connection: redis })
export const mediaQueue = new Queue('media', { connection: redis })
export const reportQueue = new Queue('reports', { connection: redis })

export type NotificationJob = {
  notificationId: bigint
  tenantId: bigint
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app'
}

export type MediaJob = {
  handoverMediaId: bigint
  filePath: string
  operation: 'compress' | 'thumbnail'
}
