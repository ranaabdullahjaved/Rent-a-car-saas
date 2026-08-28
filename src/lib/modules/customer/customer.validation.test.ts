import { describe, expect, it } from 'vitest'
import {
  createCustomerSchema,
  formatCnic,
  isLicenceExpired,
  normaliseCnic,
  normalisePhone,
} from './customer.validation'

const base = { fullName: 'Bilal Ahmed', phone: '0300 1234567' }

describe('CNIC', () => {
  it('reduces every written form to the same 13 digits', () => {
    for (const input of ['35201-1234567-1', '3520112345671', '35201 1234567 1']) {
      expect(normaliseCnic(input)).toBe('3520112345671')
    }
  })

  it('formats digits back for display', () => {
    expect(formatCnic('3520112345671')).toBe('35201-1234567-1')
  })

  it('leaves an unexpected length alone rather than mangling it', () => {
    expect(formatCnic('123')).toBe('123')
    expect(formatCnic(null)).toBeNull()
  })

  it('stores the normalised form so the unique index can do its job', () => {
    expect(createCustomerSchema.parse({ ...base, cnic: '35201-1234567-1' }).cnic).toBe(
      '3520112345671'
    )
  })

  it('rejects a CNIC that is not 13 digits', () => {
    expect(createCustomerSchema.safeParse({ ...base, cnic: '35201-123' }).success).toBe(false)
  })

  it('allows a customer with no CNIC — walk-ins often have none', () => {
    const parsed = createCustomerSchema.parse({ ...base, cnic: '' })
    expect(parsed.cnic).toBeNull()
  })
})

describe('phone normalisation', () => {
  it('treats the local, international and unprefixed forms as one number', () => {
    const forms = ['0300 1234567', '+92 300 1234567', '923001234567', '0300-1234567']
    const normalised = forms.map(normalisePhone)
    expect(new Set(normalised).size).toBe(1)
    expect(normalised[0]).toBe('3001234567')
  })

  it('rejects a number too short to be real', () => {
    expect(createCustomerSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false)
  })
})

describe('blacklisting', () => {
  it('requires a reason', () => {
    const parsed = createCustomerSchema.safeParse({ ...base, riskRating: 'blacklisted' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['blacklistReason'])
  })

  it('accepts a blacklisting with a reason', () => {
    expect(
      createCustomerSchema.safeParse({
        ...base,
        riskRating: 'blacklisted',
        blacklistReason: 'Damaged vehicle and refused to pay',
      }).success
    ).toBe(true)
  })

  it('does not demand a reason for a normal customer', () => {
    expect(createCustomerSchema.safeParse(base).success).toBe(true)
  })
})

describe('licence expiry', () => {
  const today = new Date('2026-08-28T00:00:00Z')

  it('flags a licence that expired before today', () => {
    expect(isLicenceExpired('2026-08-27', today)).toBe(true)
  })

  it('does not flag one expiring today or later', () => {
    expect(isLicenceExpired('2026-08-28', today)).toBe(false)
    expect(isLicenceExpired('2027-01-01', today)).toBe(false)
  })

  it('treats a missing expiry as not expired rather than guessing', () => {
    expect(isLicenceExpired(null, today)).toBe(false)
  })

  it('keeps the expiry as a string, since Drizzle types date columns as strings', () => {
    const parsed = createCustomerSchema.parse({ ...base, licenseExpiry: '2027-05-01' })
    expect(parsed.licenseExpiry).toBe('2027-05-01')
    expect(typeof parsed.licenseExpiry).toBe('string')
  })
})

describe('optional fields', () => {
  it('stores blanks as null rather than empty strings', () => {
    const parsed = createCustomerSchema.parse({
      ...base,
      email: '',
      city: '',
      address: '',
      notes: '',
    })
    expect(parsed.email).toBeNull()
    expect(parsed.city).toBeNull()
    expect(parsed.address).toBeNull()
    expect(parsed.notes).toBeNull()
  })

  it('rejects a malformed email but allows none at all', () => {
    expect(createCustomerSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false)
    expect(createCustomerSchema.safeParse({ ...base, email: '' }).success).toBe(true)
  })
})
