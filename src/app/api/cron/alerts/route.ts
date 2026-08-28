import { NextRequest, NextResponse } from 'next/server'
import { sweepAllTenants } from '@/lib/modules/alerts/alert.engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// The sweep walks every tenant; give it the full window Vercel allows.
export const maxDuration = 60

/**
 * Vercel Cron entry point for the alert engine.
 *
 * The Hobby plan runs crons at most once a day, so this is a floor, not the
 * cadence — the in-app bell also triggers a throttled sweep for the viewing
 * tenant whenever someone has the app open, and the BullMQ worker runs the
 * same engine every five minutes once it has a host. All three paths are
 * idempotent thanks to the notifications dedup index.
 *
 * ── NEEDS FROM YOU ─────────────────────────────────────────────────────────
 * Set CRON_SECRET in Vercel (any long random string). Vercel sends it
 * automatically as "Authorization: Bearer <CRON_SECRET>" on cron requests.
 * Without it this endpoint refuses to run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = await sweepAllTenants()
  return NextResponse.json({ ok: true, ...result })
}
