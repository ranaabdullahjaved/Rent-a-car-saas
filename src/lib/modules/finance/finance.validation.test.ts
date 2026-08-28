import { describe, expect, it } from 'vitest'
import {
  isDeposit,
  ledgerCategoryForPurpose,
  recordChargeSchema,
  recordPaymentSchema,
} from './finance.validation'
import {
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
  categoryLabel,
  isIncomeCategory,
} from './ledger.categories'

const basePayment = { bookingId: '1', amount: '5000' }

describe('payment amounts', () => {
  it('accepts whole and two-decimal amounts', () => {
    expect(recordPaymentSchema.safeParse({ ...basePayment, amount: '4500.50' }).success).toBe(true)
    expect(recordPaymentSchema.safeParse({ ...basePayment, amount: 4500 }).success).toBe(true)
  })

  it('rejects zero and negative payments', () => {
    // A refund is a separate, explicit operation — not a negative payment,
    // which would quietly reduce revenue with no audit trail.
    expect(recordPaymentSchema.safeParse({ ...basePayment, amount: '0' }).success).toBe(false)
    expect(recordPaymentSchema.safeParse({ ...basePayment, amount: '-500' }).success).toBe(false)
  })

  it('rejects more than two decimal places', () => {
    expect(recordPaymentSchema.safeParse({ ...basePayment, amount: '100.999' }).success).toBe(false)
  })

  it('defaults to cash paid now', () => {
    const p = recordPaymentSchema.parse(basePayment)
    expect(p.method).toBe('cash')
    expect(p.purpose).toBe('booking')
    expect(p.paidAt).toBeInstanceOf(Date)
  })
})

describe('security deposits', () => {
  it('is recognised as a deposit', () => {
    expect(isDeposit('security_deposit')).toBe(true)
  })

  it('every other purpose is real money earned', () => {
    for (const p of ['booking', 'damage', 'fuel', 'late_fee', 'challan', 'other']) {
      expect(isDeposit(p)).toBe(false)
    }
  })
})

describe('purpose to ledger category', () => {
  it('routes each purpose to the category its report reads from', () => {
    expect(ledgerCategoryForPurpose('damage')).toBe('damage_recovery')
    expect(ledgerCategoryForPurpose('fuel')).toBe('fuel_recovery')
    expect(ledgerCategoryForPurpose('late_fee')).toBe('late_fee')
    expect(ledgerCategoryForPurpose('challan')).toBe('challan_recovery')
    expect(ledgerCategoryForPurpose('booking')).toBe('rental')
  })

  it('every mapped category is a real income category', () => {
    for (const purpose of ['booking', 'damage', 'fuel', 'late_fee', 'challan', 'other']) {
      expect(isIncomeCategory(ledgerCategoryForPurpose(purpose))).toBe(true)
    }
  })
})

describe('ledger categories', () => {
  it('income and expense sets do not overlap', () => {
    const overlap = INCOME_CATEGORY_KEYS.filter((k) => (EXPENSE_CATEGORY_KEYS as string[]).includes(k))
    expect(overlap).toEqual([])
  })

  it('direction is derivable from the category alone', () => {
    for (const k of INCOME_CATEGORY_KEYS) expect(isIncomeCategory(k)).toBe(true)
    for (const k of EXPENSE_CATEGORY_KEYS) expect(isIncomeCategory(k)).toBe(false)
  })

  it('every category has a human label', () => {
    for (const k of [...INCOME_CATEGORY_KEYS, ...EXPENSE_CATEGORY_KEYS]) {
      expect(categoryLabel(k)).not.toBe(k)
    }
  })

  it('covers the money movements the brief names', () => {
    // Straight from the operator's description of the business.
    for (const k of ['rental', 'damage_recovery', 'fuel_recovery', 'challan_recovery', 'outsourcing']) {
      expect(INCOME_CATEGORY_KEYS).toContain(k)
    }
    for (const k of ['maintenance', 'salary', 'investor_payout', 'office', 'fuel']) {
      expect(EXPENSE_CATEGORY_KEYS).toContain(k)
    }
  })
})

describe('charges', () => {
  it('rejects a zero quantity', () => {
    expect(
      recordChargeSchema.safeParse({
        bookingId: '1',
        chargeType: 'rental',
        quantity: '0',
        unitAmount: '4500',
      }).success
    ).toBe(false)
  })

  it('rejects a charge type outside the allow-list', () => {
    expect(
      recordChargeSchema.safeParse({ bookingId: '1', chargeType: 'made_up', unitAmount: '100' })
        .success
    ).toBe(false)
  })
})
