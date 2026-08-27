import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const isServerless = process.env.DEPLOYMENT === 'serverless'

function createPool() {
  return postgres(process.env.DATABASE_URL!, {
    max: isServerless ? 1 : 10,
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
