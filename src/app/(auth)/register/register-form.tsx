'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/lib/auth/client'
import { provisionTenantAction } from '@/lib/modules/tenant/tenant.actions'

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const ownerName = String(form.get('ownerName') ?? '')
    const businessName = String(form.get('businessName') ?? '')

    // Two steps rather than one: sign-up sets the session cookie, and the
    // action that creates the workspace needs that cookie to identify the
    // user rather than trusting an id from the browser.
    const { error: signUpError } = await signUp.email({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      name: ownerName,
    })

    if (signUpError) {
      setError(
        signUpError.message?.toLowerCase().includes('exist')
          ? 'An account with that email already exists. Try signing in instead.'
          : (signUpError.message ?? 'Could not create that account.')
      )
      setPending(false)
      return
    }

    const result = await provisionTenantAction({
      businessName,
      ownerName,
      city: String(form.get('city') ?? ''),
      phone: String(form.get('phone') ?? ''),
    })

    if (!result.ok) {
      // The account exists at this point but has no workspace. Say so plainly
      // rather than implying the whole sign-up failed.
      setError(`${result.message} Your account was created — sign in to finish setting up.`)
      setPending(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required placeholder="Al-Madina Rent A Car" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ownerName">Your name</Label>
          <Input id="ownerName" name="ownerName" required autoComplete="name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="Lahore" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+92 300 1234567" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Creating workspace…' : 'Create workspace'}
      </Button>

      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  )
}
