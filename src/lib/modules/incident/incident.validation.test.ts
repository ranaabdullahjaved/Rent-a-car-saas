import { describe, expect, it } from 'vitest'
import {
  challanTotal,
  damageNetImpact,
  recordChallanSchema,
  recordDamageSchema,
} from './incident.validation'

const baseDamage = { vehicleId: '1', description: 'Rear bumper scraped in a car park' }
const baseChallan = { vehicleId: '1', amount: '2000', violationAt: '2026-08-20T14:00:00Z' }

describe('damage net impact', () => {
  it('computes the case from the brief: 30k repair charged at 50k', () => {
    // "the damages are of 30k but i charge 50k" — a 20k gain, not a 20k cost.
    expect(damageNetImpact('30000', '50000')).toBe('20000.00')
  })

  it('goes negative when the operator absorbs part of it', () => {
    // "sometime customer can't pay enough so i have to compensate from my own
    // pocket" — this must be allowed to be negative, not clamped to zero.
    expect(damageNetImpact('30000', '12000')).toBe('-18000.00')
  })

  it('is zero when the customer pays exactly the repair cost', () => {
    expect(damageNetImpact('18500', '18500')).toBe('0.00')
  })

  it('stays exact with decimal amounts', () => {
    expect(damageNetImpact('30000.55', '50000.05')).toBe('19999.50')
  })

  it('handles damage that was never charged on', () => {
    expect(damageNetImpact('8000', '0')).toBe('-8000.00')
  })
})

describe('challan total', () => {
  it('adds the late surcharge', () => {
    expect(challanTotal('2000', '500')).toBe('2500.00')
  })

  it('works with no surcharge', () => {
    expect(challanTotal('2000', '0')).toBe('2000.00')
  })
})

describe('damage validation', () => {
  it('requires a description of what happened', () => {
    expect(recordDamageSchema.safeParse({ ...baseDamage, description: 'x' }).success).toBe(false)
  })

  it('refuses to charge a customer with no booking to bill', () => {
    const parsed = recordDamageSchema.safeParse({ ...baseDamage, amountChargedToCustomer: '50000' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['bookingId'])
  })

  it('allows an uncharged incident with no booking — a car damaged on the yard', () => {
    expect(recordDamageSchema.safeParse({ ...baseDamage, actualRepairCost: '8000' }).success).toBe(
      true
    )
  })

  it('allows charging when the booking is linked', () => {
    expect(
      recordDamageSchema.safeParse({
        ...baseDamage,
        bookingId: '7',
        actualRepairCost: '30000',
        amountChargedToCustomer: '50000',
      }).success
    ).toBe(true)
  })

  it('defaults costs to zero rather than null, so arithmetic is always safe', () => {
    const p = recordDamageSchema.parse(baseDamage)
    expect(p.estimatedCost).toBe('0')
    expect(p.actualRepairCost).toBe('0')
    expect(p.amountChargedToCustomer).toBe('0')
    expect(p.downtimeDays).toBe('0')
  })
})

describe('challan validation', () => {
  it('requires the booking when the customer is liable', () => {
    const parsed = recordChallanSchema.safeParse({ ...baseChallan, liability: 'customer' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['bookingId'])
  })

  it('does not require a booking when the company is liable', () => {
    expect(recordChallanSchema.safeParse({ ...baseChallan, liability: 'company' }).success).toBe(true)
  })

  it('rejects a zero fine', () => {
    expect(recordChallanSchema.safeParse({ ...baseChallan, amount: '0' }).success).toBe(false)
  })

  it('requires when the violation happened', () => {
    expect(recordChallanSchema.safeParse({ ...baseChallan, violationAt: '' }).success).toBe(false)
  })
})
