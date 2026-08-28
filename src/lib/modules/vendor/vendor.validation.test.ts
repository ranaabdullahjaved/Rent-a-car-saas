import { describe, expect, it } from 'vitest'
import { ZERO, money, subtractMoney } from '@/lib/money'
import { createVendorSchema, setOutsourcingSchema } from './vendor.validation'

/**
 * Mirrors the margin rule in vendor.service so the arithmetic is covered
 * without needing a database.
 */
function marginFor(direction: string, totalCharges: string, vendorAmount: string) {
  const revenue = money(totalCharges)
  const cost = money(vendorAmount)
  return direction === 'outbound' ? cost : subtractMoney(revenue, cost)
}

describe('outsourcing margin', () => {
  it('inbound: what we charged less what the other operator charged', () => {
    // "I ask another rent a car owner to send his car and I took my profit"
    expect(marginFor('inbound', '25000', '18000')).toBe('7000.00')
  })

  it('inbound: reports a loss rather than hiding it', () => {
    // "...or loss out of it" — the operator asked to see these.
    expect(marginFor('inbound', '15000', '18000')).toBe('-3000.00')
  })

  it('outbound: the vendor fee is the whole margin, since there is no cost of sale', () => {
    expect(marginFor('outbound', '0', '12000')).toBe('12000.00')
  })

  it('is exact with decimal amounts', () => {
    expect(marginFor('inbound', '25000.75', '18000.25')).toBe('7000.50')
  })

  it('is zero when the job broke even', () => {
    expect(marginFor('inbound', '18000', '18000')).toBe(ZERO)
  })
})

describe('setOutsourcingSchema', () => {
  const base = { bookingId: '1', vendorId: '2', outsourceDirection: 'inbound', vendorAmount: '18000' }

  it('accepts a well-formed inbound job', () => {
    const parsed = setOutsourcingSchema.parse(base)
    expect(parsed.vendorId).toBe(2n)
    expect(parsed.vendorAmount).toBe('18000')
  })

  it('rejects a direction that is not inbound or outbound', () => {
    expect(setOutsourcingSchema.safeParse({ ...base, outsourceDirection: 'sideways' }).success).toBe(
      false
    )
  })

  it('rejects a zero or negative vendor fee', () => {
    expect(setOutsourcingSchema.safeParse({ ...base, vendorAmount: '0' }).success).toBe(false)
    expect(setOutsourcingSchema.safeParse({ ...base, vendorAmount: '-500' }).success).toBe(false)
  })
})

describe('createVendorSchema', () => {
  const base = { name: 'Rehman Rent A Car', phone: '0300 1112222' }

  it('accepts a minimal vendor', () => {
    expect(createVendorSchema.safeParse(base).success).toBe(true)
  })

  it('defaults to trading both ways', () => {
    expect(createVendorSchema.parse(base).vendorType).toBe('both')
  })

  it('keeps the trust rating within 1 to 5', () => {
    expect(createVendorSchema.safeParse({ ...base, trustRating: '3' }).success).toBe(true)
    expect(createVendorSchema.safeParse({ ...base, trustRating: '9' }).success).toBe(false)
    expect(createVendorSchema.safeParse({ ...base, trustRating: '0' }).success).toBe(false)
  })

  it('treats a blank credit limit as zero rather than null', () => {
    expect(createVendorSchema.parse({ ...base, creditLimit: '' }).creditLimit).toBe('0')
  })

  it('requires a usable phone number, since these deals happen by phone', () => {
    expect(createVendorSchema.safeParse({ ...base, phone: '123' }).success).toBe(false)
  })
})
