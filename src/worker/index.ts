import 'dotenv/config'
import { Queue, Worker } from 'bullmq'
import { redis } from './queues'
import { sweepAllTenants } from '@/lib/modules/alerts/alert.engine'
import { processNotificationJob } from './processors/notification.processor'
import type { NotificationJob } from './queues'

console.log('🔧 Worker process started')

/**
 * The alert sweep as a repeatable job — every five minutes, indefinitely.
 * This is the proper home for it; the Vercel Cron route is the interim that
 * covers the gap until this process has a host. Both call the same engine,
 * and the dedup index makes them safe to run side by side.
 */
const alertQueue = new Queue('alerts', { connection: redis })

async function armRepeatableSweep() {
  await alertQueue.upsertJobScheduler('alert-sweep', { every: 5 * 60_000 }, { name: 'sweep' })
  console.log('⏰ Alert sweep armed: every 5 minutes')
}

const alertWorker = new Worker(
  'alerts',
  async () => {
    const r = await sweepAllTenants()
    if (r.created || r.sent) {
      console.log(`Alert sweep: ${r.created} scheduled, ${r.sent} sent across ${r.tenants} tenants`)
    }
  },
  { connection: redis, concurrency: 1 }
)

const notificationWorker = new Worker(
  'notifications',
  async (job) => processNotificationJob(job.data as NotificationJob),
  { connection: redis, concurrency: 5 }
)

for (const [name, w] of [
  ['alerts', alertWorker],
  ['notifications', notificationWorker],
] as const) {
  w.on('failed', (job, err) => console.error(`${name} job ${job?.id} failed:`, err))
}

void armRepeatableSweep()

process.on('SIGTERM', async () => {
  await alertWorker.close()
  await notificationWorker.close()
  process.exit(0)
})
