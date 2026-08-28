import { describe, expect, it } from 'vitest'
import { provisionTenantSchema, slugify } from './tenant.validation'

describe('slugify', () => {
  it('builds a url-safe slug from a business name', () => {
    expect(slugify('Al-Madina Rent A Car')).toBe('al-madina-rent-a-car')
  })

  it('collapses punctuation and trims stray separators', () => {
    expect(slugify('  Khan & Sons (Pvt.) Ltd.  ')).toBe('khan-sons-pvt-ltd')
  })

  it('never returns an empty slug', () => {
    // A name in Urdu script strips to nothing under an ASCII slug rule; the
    // tenant still needs an addressable slug.
    expect(slugify('کرایہ')).toBe('tenant')
    expect(slugify('!!!')).toBe('tenant')
  })

  it('caps length so the slug column stays sane', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(48)
  })
})

describe('provisionTenantSchema', () => {
  it('accepts a minimal submission with optional fields blank', () => {
    const parsed = provisionTenantSchema.safeParse({
      businessName: 'Al-Madina Rent A Car',
      ownerName: 'Bilal Ahmed',
      city: '',
      phone: '',
    })
    expect(parsed.success).toBe(true)
  })

  it('trims surrounding whitespace', () => {
    const parsed = provisionTenantSchema.parse({
      businessName: '  Al-Madina  ',
      ownerName: '  Bilal  ',
    })
    expect(parsed.businessName).toBe('Al-Madina')
    expect(parsed.ownerName).toBe('Bilal')
  })

  it('rejects a one-character business name', () => {
    const parsed = provisionTenantSchema.safeParse({ businessName: 'A', ownerName: 'Bilal Ahmed' })
    expect(parsed.success).toBe(false)
  })
})
