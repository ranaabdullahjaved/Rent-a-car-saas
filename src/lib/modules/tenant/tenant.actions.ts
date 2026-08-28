'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { AppError } from '@/lib/errors'
import { provisionTenant } from './tenant.service'
import { provisionTenantSchema } from './tenant.validation'

export type ActionResult = { ok: true } | { ok: false; message: string }

/**
 * Called straight after sign-up, from the browser, so the session cookie the
 * sign-up request set is already attached.
 *
 * A Server Action is a public HTTP endpoint, so it re-derives the user from
 * the session rather than trusting anything the client passes.
 */
export async function provisionTenantAction(input: unknown): Promise<ActionResult> {
  const parsed = provisionTenantSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Those details are not valid.' }
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false, message: 'Your session expired. Please sign in again.' }
  }

  try {
    await provisionTenant(BigInt(session.user.id), parsed.data)
    return { ok: true }
  } catch (err) {
    if (err instanceof AppError) return { ok: false, message: err.message }
    console.error('provisionTenantAction failed', err)
    return { ok: false, message: 'Could not create your workspace. Please try again.' }
  }
}
