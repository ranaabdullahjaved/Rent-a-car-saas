import type { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Create your workspace' }

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md animate-enter rounded-2xl border bg-card p-7 shadow-lg shadow-black/5">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your rent-a-car business. You can add vehicles and staff next.
        </p>
      </div>
      <RegisterForm />
    </div>
  )
}
