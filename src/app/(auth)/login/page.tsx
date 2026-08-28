import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your fleet, bookings and accounts.
        </p>
      </div>
      {/* useSearchParams needs a Suspense boundary to keep this page static. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
