import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'

async function runMigrations() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

  const client = postgres(url, { max: 1, connect_timeout: 300 })
  const db = drizzle(client)

  console.log('⏳ Running migrations...')
  const start = Date.now()

  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'src/db/migrations'),
  })

  console.log(`✅ Migrations complete in ${Date.now() - start}ms`)
  await client.end()
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
