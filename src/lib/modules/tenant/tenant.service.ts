import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tenants, users } from '@/db/schema'
import { AppError } from '@/lib/errors'
import { slugify, type ProvisionTenantInput } from './tenant.validation'

const SLUG_ATTEMPTS = 5

/**
 * Creates the workspace for a freshly signed-up user and makes them its
 * owner. The tenant insert and the user update share one transaction, so a
 * failure cannot leave a workspace with nobody attached to it.
 */
export async function provisionTenant(userId: bigint, input: ProvisionTenantInput) {
  const [existing] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!existing) throw new AppError('Account not found', 'NOT_FOUND', 404)
  if (existing.tenantId) {
    throw new AppError('This account already belongs to a workspace', 'ALREADY_PROVISIONED', 409)
  }

  const base = slugify(input.businessName)

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    // tenants.slug is unique. Rather than SELECT-then-INSERT (a race), try
    // the insert and let the constraint arbitrate.
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    try {
      return await db.transaction(async (tx) => {
        const [tenant] = await tx
          .insert(tenants)
          .values({
            name: input.businessName,
            slug,
            ownerName: input.ownerName,
            city: input.city || null,
            phone: input.phone || null,
          })
          .returning()

        if (!tenant) throw new AppError('Could not create workspace', 'PROVISION_FAILED', 500)

        await tx
          .update(users)
          .set({ tenantId: tenant.id, role: 'owner', updatedAt: new Date() })
          .where(eq(users.id, userId))

        return tenant
      })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === '23505') continue // slug taken, try the next suffix
      throw err
    }
  }

  throw new AppError(
    'Could not generate a unique workspace address. Try a slightly different business name.',
    'SLUG_EXHAUSTED',
    409
  )
}
