import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

// No baseURL on purpose. Better Auth then calls /api/auth on whatever origin
// the page is served from, which is always correct: localhost on any port,
// every Vercel preview deployment (each gets a fresh hostname), and
// production. Pinning it to NEXT_PUBLIC_APP_URL bakes one absolute origin in
// at build time, so the browser posts sign-in to that host no matter where
// the app is actually running.
export const authClient = createAuthClient({
  plugins: [organizationClient()],
})

export const { signIn, signOut, signUp, useSession } = authClient
