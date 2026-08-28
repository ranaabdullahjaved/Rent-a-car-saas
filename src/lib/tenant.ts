import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { TenantError } from './errors'
import { auth } from './auth/server'

// Re-exported so callers can keep importing it alongside requireTenant.
export { TenantError }

export type TenantContext = {
  tenantId: bigint
  userId: bigint
  role: string
}

/**
 * Call this at the top of every Route Handler and Server Component
 * that touches the database. Never skip it.
 *
 * The tenant is read from the users table rather than from the session,
 * for two reasons:
 *
 *  1. users.tenant_id is a bigint. Exposing it through Better Auth's
 *     `additionalFields` would put a BigInt into a JSON session payload,
 *     which cannot be serialised.
 *  2. Session data is cookie-cached for seven days. Reading the row means
 *     deactivating a user takes effect on their next request rather than
 *     whenever their cached cookie happens to expire.
 *
 * Wrapped in React's cache() so repeated calls within one request — a
 * layout and its page, say — issue a single query.
 */
export const requireTenant = cache(async function requireTenant(): Promise<TenantContext> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    throw new TenantError('Unauthenticated')
  }

  const userId = BigInt(session.user.id)

  const [row] = await db
    .select({
      tenantId: users.tenantId,
      role: users.role,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!row || row.deletedAt) {
    throw new TenantError('This account no longer exists')
  }
  if (!row.isActive) {
    throw new TenantError('This account has been deactivated')
  }
  if (!row.tenantId) {
    throw new TenantError('No tenant associated with this account')
  }

  return { tenantId: row.tenantId, userId, role: row.role }
})

/**
 * Page-level variant. Server Components should redirect an unauthenticated
 * visitor to the login screen rather than surfacing a raw error.
 */
export async function requireTenantOrRedirect(): Promise<TenantContext> {
  try {
    return await requireTenant()
  } catch (err) {
    if (err instanceof TenantError) {
      redirect('/login')
    }
    throw err
  }
}
