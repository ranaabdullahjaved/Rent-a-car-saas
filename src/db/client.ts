import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const rawDatabaseUrl = process.env.DATABASE_URL

// This module is evaluated while Next collects page data during the build, so
// anything thrown here fails the whole deployment. The checks below are cheap
// and, crucially, explain what is wrong — an unexplained ERR_INVALID_URL at
// build time is very hard to trace back to a dashboard setting.
/**
 * Describes the shape of a connection string without revealing it.
 *
 * Letters become 'a' and digits '9'; punctuation is kept. That is enough to
 * spot a `psql ` prefix, a stray `DATABASE_URL=`, wrapping quotes, an embedded
 * space or a missing colon — while carrying none of the secret, so a hosting
 * platform's log redaction has nothing to match and will not blank it out.
 */
function describeShape(value: string): string {
  const masked = value.replace(/[A-Za-z]/g, 'a').replace(/[0-9]/g, '9')
  const head = masked.slice(0, 48)
  const notable: string[] = []
  if (/^\s|\s$/.test(value)) notable.push('surrounding whitespace')
  if (/["']/.test(value)) notable.push('quote characters')
  if (/\s/.test(value.trim())) notable.push('an embedded space or newline')
  if (value.includes('#')) notable.push('a # character')
  if (value.includes('<') || value.includes('>')) notable.push('angle brackets')
  if (!value.includes('@')) notable.push('no @ separating credentials from host')
  return (
    `length=${value.length}, shape="${head}${masked.length > 48 ? '…' : ''}"` +
    (notable.length ? `, contains ${notable.join(', ')}` : '')
  )
}

if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL is not set')
}
if (!/^postgres(ql)?:\/\//.test(rawDatabaseUrl)) {
  throw new Error(
    'DATABASE_URL must begin with postgres:// or postgresql:// with nothing ' +
      'before it — no quotes, no "psql ", no "DATABASE_URL=" prefix. ' +
      `Got ${describeShape(rawDatabaseUrl)}`
  )
}
if (/\s/.test(rawDatabaseUrl)) {
  throw new Error(
    'DATABASE_URL contains a space or line break. ' +
      `Got ${describeShape(rawDatabaseUrl)}`
  )
}

// Narrowing from the guard above does not survive into createPool's closure,
// so re-bind it as a plain string once it is known to be valid.
const databaseUrl: string = rawDatabaseUrl

const isServerless = process.env.DEPLOYMENT === 'serverless'

// Supabase's pooler (PgBouncer) runs on 6543 in transaction-pooling mode,
// where a connection is handed to a different client between statements.
// Prepared statements are per-connection server-side objects, so postgres.js
// must not use them here or queries fail once traffic is concurrent.
//
// Detected from the connection string rather than from DEPLOYMENT, so that
// pointing any environment at the pooler is safe on its own — and by matching
// on the string rather than parsing it as a URL, because new URL() throws on a
// malformed value and would take the build down with it.
const isPooled = /:6543(\/|\?|$)/.test(databaseUrl) || databaseUrl.includes('pooler')

function createPool() {
  return postgres(databaseUrl, {
    max: isServerless ? 1 : 10,
    prepare: !isPooled,
    connect_timeout: 10,
    idle_timeout: 1800,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // CRITICAL: return numeric columns as strings, never floats
    // OID 1700 = numeric/decimal
    types: {
      numeric: {
        to: 0,
        from: [1700],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  })
}

// Singleton pattern prevents connection pool exhaustion during Next.js hot reload
declare global {
  var __pgPool: ReturnType<typeof postgres> | undefined
  var __db: ReturnType<typeof drizzle<typeof schema>> | undefined
}

export const pgPool = globalThis.__pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalThis.__pgPool = pgPool

export const db = globalThis.__db ?? drizzle(pgPool, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})
if (process.env.NODE_ENV !== 'production') globalThis.__db = db

export type Database = typeof db
