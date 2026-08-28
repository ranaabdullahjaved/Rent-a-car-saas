import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const rawDatabaseUrl = process.env.DATABASE_URL

// This module is evaluated while Next collects page data during the build, so
// anything thrown here fails the whole deployment. The checks below are cheap
// and, crucially, explain what is wrong — an unexplained ERR_INVALID_URL at
// build time is very hard to trace back to a dashboard setting.
if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL is not set')
}
if (/^\s*["']|["']\s*$/.test(rawDatabaseUrl)) {
  throw new Error(
    'DATABASE_URL is wrapped in quotes. A .env file strips those, but a hosting ' +
      'dashboard stores the value literally, so the quotes become part of the ' +
      'connection string. Remove the surrounding quotes.'
  )
}
if (!/^postgres(ql)?:\/\//.test(rawDatabaseUrl.trim())) {
  throw new Error(
    'DATABASE_URL must start with postgres:// or postgresql://. Check for a ' +
      'stray character at the start of the value.'
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
