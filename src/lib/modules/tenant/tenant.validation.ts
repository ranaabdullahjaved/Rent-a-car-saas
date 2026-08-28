import { z } from 'zod'

export const provisionTenantSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is too short').max(120),
  ownerName: z.string().trim().min(2, 'Owner name is too short').max(120),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
})

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'tenant'
}
