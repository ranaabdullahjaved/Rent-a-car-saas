import { describe, expect, it } from 'vitest'
import { ZERO, money, multiplyMoney, subtractMoney } from '@/lib/money'
import {
  AGREEMENT_TYPES,
  createAgreementSchema,
  deductibleCategories,
  payoutPeriodSchema,
} from './agreement.validation'

/** Mirrors the share calculation in agreement.service. */
function share(amount: string, percent: string) {
  return multiplyMoney(money(amount), (Number(percent) / 100).toFixed(6))
}

const base = {
  investorId: '1',
  vehicleId: '2',
  effectiveFrom: '2026-01-01',
}

describe('payout arithmetic', () => {
  it('takes a percentage of revenue for a revenue share', () => {
    expect(share('120000', '60')).toBe('72000.00')
  })

  it('handles a fractional percentage exactly', () => {
    expect(share('120000', '62.5')).toBe('75000.00')
  })

  it('takes the share of profit after deductions for a profit share', () => {
    // 120,000 revenue less 18,500 of maintenance the investor absorbs,
    // then 60% of what is left.
    const profit = subtractMoney(money('120000'), money('18500'))
    expect(profit).toBe('101500.00')
    expect(share(profit, '60')).toBe('60900.00')
  })

  it('pays fixed rent regardless of what the car earned', () => {
    // A car that sat idle all month still owes the investor their rent.
    const rent = money('45000')
    expect(rent).toBe('45000.00')
  })

  it('gives a zero share when the car earned nothing', () => {
    expect(share('0', '60')).toBe(ZERO)
  })

  it('stays exact on amounts with paisa', () => {
    expect(share('18002.50', '60')).toBe('10801.50')
  })
})

describe('deductibleCategories', () => {
  const flags = {
    investorAbsorbsMaintenance: false,
    investorAbsorbsDamage: false,
    investorAbsorbsChallans: false,
  }

  it('deducts nothing from a revenue share, whatever the flags say', () => {
    // A revenue share is a slice of the top line by definition.
    expect(
      deductibleCategories({
        ...flags,
        agreementType: 'revenue_share',
        investorAbsorbsMaintenance: true,
        investorAbsorbsDamage: true,
      })
    ).toEqual([])
  })

  it('deducts nothing from fixed rent', () => {
    expect(
      deductibleCategories({ ...flags, agreementType: 'fixed_rent', investorAbsorbsMaintenance: true })
    ).toEqual([])
  })

  it('deducts only what the investor agreed to absorb', () => {
    expect(
      deductibleCategories({ ...flags, agreementType: 'profit_share', investorAbsorbsMaintenance: true })
    ).toEqual(['maintenance', 'fuel'])

    expect(
      deductibleCategories({ ...flags, agreementType: 'profit_share', investorAbsorbsChallans: true })
    ).toEqual(['challan_paid'])
  })

  it('deducts nothing when the company absorbs everything', () => {
    expect(deductibleCategories({ ...flags, agreementType: 'profit_share' })).toEqual([])
  })
})

describe('agreement validation', () => {
  it('requires a percentage for the share types', () => {
    for (const agreementType of ['revenue_share', 'profit_share']) {
      const parsed = createAgreementSchema.safeParse({ ...base, agreementType })
      expect(parsed.success, `${agreementType} needs a percentage`).toBe(false)
      if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['sharePercent'])
    }
  })

  it('requires an amount for fixed rent', () => {
    const parsed = createAgreementSchema.safeParse({ ...base, agreementType: 'fixed_rent' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['fixedMonthlyAmount'])
  })

  it('accepts a well-formed revenue share', () => {
    expect(
      createAgreementSchema.safeParse({ ...base, agreementType: 'revenue_share', sharePercent: '60' })
        .success
    ).toBe(true)
  })

  it('rejects a share above 100 percent', () => {
    expect(createAgreementSchema.safeParse({ ...base, sharePercent: '140' }).success).toBe(false)
  })

  it('allows an open-ended agreement', () => {
    const parsed = createAgreementSchema.parse({ ...base, sharePercent: '60', effectiveTo: '' })
    expect(parsed.effectiveTo).toBeNull()
  })

  it('rejects an end date before the start', () => {
    const parsed = createAgreementSchema.safeParse({
      ...base,
      sharePercent: '60',
      effectiveTo: '2025-06-01',
    })
    expect(parsed.success).toBe(false)
  })

  it('reads the absorb flags from checkbox values', () => {
    const parsed = createAgreementSchema.parse({
      ...base,
      sharePercent: '60',
      investorAbsorbsMaintenance: 'on',
    })
    expect(parsed.investorAbsorbsMaintenance).toBe(true)
    expect(parsed.investorAbsorbsDamage).toBe(false)
  })

  it('covers exactly the three deal shapes operators use', () => {
    expect([...AGREEMENT_TYPES]).toEqual(['revenue_share', 'profit_share', 'fixed_rent'])
  })
})

describe('payout period', () => {
  it('rejects a period that ends before it starts', () => {
    expect(
      payoutPeriodSchema.safeParse({ investorId: '1', from: '2026-08-01', to: '2026-07-01' }).success
    ).toBe(false)
  })

  it('accepts a single-day period', () => {
    expect(
      payoutPeriodSchema.safeParse({ investorId: '1', from: '2026-08-01', to: '2026-08-01' }).success
    ).toBe(true)
  })
})
