import { headers } from 'next/headers'
import { auth } from './auth/server'

export class TenantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantError'
  }
}

// Call this at the top of every Route Handler and Server Component
// that touches the database. Never skip it.
export async function requireTenant(): Promise<{ tenantId: bigint; userId: bigint }> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    throw new TenantError('Unauthenticated')
  }

  // Better Auth's default user model doesn't know about our custom
  // tenantId column, so its inferred session.user type omits it.
  const tenantId = (session.user as Record<string, unknown>).tenantId as bigint | undefined
  if (!tenantId) {
    throw new TenantError('No tenant associated with this account')
  }

  return {
    tenantId,
    userId: session.user.id as unknown as bigint,
  }
}
