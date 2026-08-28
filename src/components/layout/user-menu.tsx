'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/client'

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onSignOut() {
    setPending(true)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{email}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onSignOut} disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  )
}
