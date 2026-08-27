'use client'

import { authClient } from '@/lib/auth/client'

// Wraps Better Auth's active-organization state — an organization here
// maps 1:1 to a tenant.
export function useTenant() {
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization()
  return { tenant: activeOrganization, isPending }
}
