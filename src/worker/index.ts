import 'dotenv/config'
import { Worker } from 'bullmq'
import { redis } from './queues'

console.log('🔧 Worker process started')

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    console.log(`Processing notification job ${job.id}`)
    // import and call notification.processor.ts
  },
  { connection: redis, concurrency: 5 }
)

const mediaWorker = new Worker(
  'media',
  async (job) => {
    console.log(`Processing media job ${job.id}`)
    // import and call media.processor.ts
  },
  { connection: redis, concurrency: 3 }
)

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err)
})

mediaWorker.on('failed', (job, err) => {
  console.error(`Media job ${job?.id} failed:`, err)
})

process.on('SIGTERM', async () => {
  await notificationWorker.close()
  await mediaWorker.close()
  process.exit(0)
})
