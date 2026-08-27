// queues.ts declares `reportQueue` but no job payload shape yet — this is
// the type this processor expects until a real report job is designed.
export type ReportJob = {
  tenantId: bigint
  reportType: 'revenue' | 'utilization' | 'investor_payout'
  periodStart: string
  periodEnd: string
}

export async function processReportJob(job: ReportJob) {
  console.log(`Report job: ${job.reportType} for tenant ${job.tenantId} (${job.periodStart} – ${job.periodEnd})`)
}
