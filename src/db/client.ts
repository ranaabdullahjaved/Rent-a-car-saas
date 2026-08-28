import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const isServerless = process.env.DEPLOYMENT === 'serverless'

// Supabase's pooler (PgBouncer) runs on 6543 in transaction-pooling mode,
// where a connection is handed to a different client between statements.
// Prepared statements are per-connection server-side objects, so postgres.js
// must not use them here or queries fail once traffic is concurrent.
//
// This is detected from the URL rather than from DEPLOYMENT so that pointing
// any environment at the pooler is safe on its own.
const dbUrl = new URL(process.env.DATABASE_URL!)
const isPooled = dbUrl.port === '6543' || dbUrl.hostname.includes('pooler')

function createPool() {
  return postgres(process.env.DATABASE_URL!, {
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
  // eslint-disable-next-line no-var
  var __pgPool: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
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
