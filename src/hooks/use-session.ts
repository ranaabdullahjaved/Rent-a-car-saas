'use client'

import { useSession as useAuthSession } from '@/lib/auth/client'

export function useSession() {
  return useAuthSession()
}
