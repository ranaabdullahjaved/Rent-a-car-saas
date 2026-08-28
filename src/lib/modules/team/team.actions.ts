'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { tenants, users } from '@/db/schema'
import { AppError } from '@/lib/errors'
import { ROLES, type Role } from '@/lib/permissions'
import { auth } from '@/lib/auth/server'
import { requireCan, requireTenant } from '@/lib/tenant'

export type TeamActionResult = { ok: true } | { ok: false; message: string }

function failure(err: unknown): TeamActionResult {
  if (err instanceof AppError) return { ok: false, message: err.message }
  console.error('team action failed', err)
  return { ok: false, message: 'Something went wrong. Nothing was saved.' }
}

function parseRole(value: unknown): Role {
  if (typeof value === 'string' && (ROLES as readonly string[]).includes(value)) return value as Role
  throw new AppError('Choose a valid role.', 'INVALID_ROLE', 422)
}

/**
 * Creates a staff account directly. The owner sets a starting password and
 * hands it over in person — which is how a small rental office actually
 * onboards staff, and avoids depending on email delivery that is not yet
 * configured. Better Auth hashes the password exactly as a self-signup would.
 */
export async function addTeamMemberAction(form: FormData): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenant()
    requireCan(ctx, 'team.manage')

    const name = String(form.get('name') ?? '').trim()
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')
    const role = parseRole(form.get('role'))

    if (name.length < 2) return { ok: false, message: 'Enter the person’s name.' }
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'Enter a valid email.' }
    if (password.length < 8) return { ok: false, message: 'The starting password needs at least 8 characters.' }
    if (role === 'owner') return { ok: false, message: 'A workspace has one owner — pick another role.' }

    // Creates user + credential through Better Auth so the password is hashed
    // identically to self-signup. The session it opens belongs to this server
    // call and is discarded, not sent to any browser.
    await auth.api.signUpEmail({ body: { email, password, name } })

    const [updated] = await db
      .update(users)
      .set({ tenantId: ctx.tenantId, role, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning({ id: users.id })
    if (!updated) throw new AppError('The account was created but could not be attached.', 'ATTACH_FAILED', 500)

    revalidatePath('/settings')
    return { ok: true }
  } catch (err) {
    const message = (err as { body?: { message?: string } }).body?.message
    if (message?.toLowerCase().includes('exist')) {
      return { ok: false, message: 'An account with that email already exists.' }
    }
    return failure(err)
  }
}

export async function setMemberRoleAction(memberId: string, roleValue: string): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenant()
    requireCan(ctx, 'team.manage')
    const role = parseRole(roleValue)

    if (BigInt(memberId) === ctx.userId) {
      return { ok: false, message: 'You cannot change your own role — another owner would have to.' }
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, BigInt(memberId)), eq(users.tenantId, ctx.tenantId)))

    revalidatePath('/settings')
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

/**
 * Deactivation takes effect on the member's next request: requireTenant reads
 * is_active from the row on every request precisely so this works immediately
 * rather than when their session cookie expires.
 */
export async function setMemberActiveAction(memberId: string, active: boolean): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenant()
    requireCan(ctx, 'team.manage')

    if (BigInt(memberId) === ctx.userId) {
      return { ok: false, message: 'You cannot deactivate yourself.' }
    }

    await db
      .update(users)
      .set({ isActive: active, updatedAt: new Date() })
      .where(and(eq(users.id, BigInt(memberId)), eq(users.tenantId, ctx.tenantId)))

    revalidatePath('/settings')
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}

/** Business defaults: turnaround buffer and the fuel rate used at check-in. */
export async function updateBusinessDefaultsAction(form: FormData): Promise<TeamActionResult> {
  try {
    const ctx = await requireTenant()
    requireCan(ctx, 'settings.manage')

    const name = String(form.get('name') ?? '').trim()
    const buffer = Number(form.get('defaultBufferMinutes') ?? 0)
    const fuelRate = String(form.get('fuelRatePerLitre') ?? '').trim()

    if (name.length < 2) return { ok: false, message: 'The business needs a name.' }
    if (!Number.isInteger(buffer) || buffer < 0 || buffer > 24 * 60) {
      return { ok: false, message: 'The buffer must be between 0 and 1440 minutes.' }
    }
    if (!/^\d+(\.\d{1,2})?$/.test(fuelRate) || Number(fuelRate) <= 0) {
      return { ok: false, message: 'Enter the fuel rate as rupees per litre.' }
    }

    await db
      .update(tenants)
      .set({
        name,
        defaultBufferMinutes: buffer,
        settings: sql`${tenants.settings} || jsonb_build_object('fuelRatePerLitre', ${fuelRate}::text)`,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, ctx.tenantId))

    revalidatePath('/settings')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    return failure(err)
  }
}
