import { NextRequest, NextResponse } from 'next/server'

// Public, unauthenticated, and deliberately free of anything sensitive.
// Its job is to let us verify from outside that a given commit actually
// reached production — a failed Vercel build leaves the previous commit
// serving, so a stale `commit` here is how we detect it.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Evaluated once per cold start, not per request.
const STARTED_AT = new Date().toISOString()

export async function GET(request: NextRequest) {
  const body: Record<string, unknown> = {
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    region: process.env.VERCEL_REGION ?? null,
    deployment: process.env.DEPLOYMENT ?? null,
    startedAt: STARTED_AT,
    now: new Date().toISOString(),
  }

  // Opt-in so routine polling doesn't open a database connection.
  // Imported lazily: a missing DATABASE_URL throws at module load in
  // db/client, and health should still be able to report that.
  if (request.nextUrl.searchParams.get('db') === '1') {
    const startedAt = Date.now()
    try {
      const { pgPool } = await import('@/db/client')
      await pgPool`select 1`
      body.db = { ok: true, latencyMs: Date.now() - startedAt }
    } catch (err) {
      body.ok = false
      body.db = { ok: false, error: err instanceof Error ? err.message : 'unknown' }
    }
  }

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  })
}
