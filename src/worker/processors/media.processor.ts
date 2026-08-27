import type { MediaJob } from '../queues'

// No image/video processing library is in the fixed tech stack yet
// (e.g. sharp for thumbnails, ffmpeg for video compression).
// Wire one in here before enabling this processor for real.
export async function processMediaJob(job: MediaJob) {
  console.log(`Media job: ${job.operation} on ${job.filePath} (handover media ${job.handoverMediaId})`)
}
