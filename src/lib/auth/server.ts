import { randomUUID } from 'crypto'
import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db/client'
import * as schema from '@/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Our table names (users, sessions, organizations, ...) are plural;
    // Better Auth's default model names are singular.
    usePlural: true,
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
      organizations: schema.organizations,
      members: schema.members,
      invitations: schema.invitations,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // enable when Resend is configured
  },
  // Table/field mapping to our schema lives on the adapter above — the
  // plugin's own `schema` option is only for renaming models/fields, which
  // we don't need here.
  plugins: [organization()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    // Vercel sets this automatically on every deployment (including
    // preview deployments, which get a fresh URL each time) — without it,
    // auth would only work on whichever domain BETTER_AUTH_URL points to.
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  advanced: {
    database: {
      // users.id is a bigserial in our schema — let Postgres generate it.
      // Every other Better Auth table (sessions, accounts, ...) keeps a
      // plain text id, so those still get Better Auth's normal random id.
      generateId: ({ model }) => (model === 'user' ? false : randomUUID()),
    },
  },
})

export type Auth = typeof auth
