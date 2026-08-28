import { describe, expect, it } from 'vitest'
import {
  ZERO,
  addMoney,
  formatPKR,
  isPositive,
  money,
  multiplyMoney,
  subtractMoney,
} from './money'

describe('money', () => {
  it('normalises to two decimal places', () => {
    expect(money('5')).toBe('5.00')
    expect(money(5.1)).toBe('5.10')
    expect(money('1234.567')).toBe('1234.57')
  })

  it('rejects values that are not numbers', () => {
    expect(() => money('not-a-number')).toThrow(/Invalid money value/)
  })

  it('accepts the string form Postgres returns for numeric columns', () => {
    // db/client overrides the numeric parser so 1700 comes back as a string.
    expect(money('14999.00')).toBe('14999.00')
  })
})

describe('arithmetic', () => {
  // The whole reason decimal.js is in the stack: 0.1 + 0.2 === 0.30000000000000004
  // in float arithmetic, and this is a financial system.
  it('adds without floating point drift', () => {
    expect(addMoney(money('0.1'), money('0.2'))).toBe('0.30')
  })

  it('subtracts without floating point drift', () => {
    expect(subtractMoney(money('1000.10'), money('0.20'))).toBe('999.90')
  })

  it('multiplies a daily rate across a rental correctly', () => {
    expect(multiplyMoney(money('4500.50'), 7)).toBe('31503.50')
  })

  it('keeps a long chain of additions exact', () => {
    let total = ZERO
    for (let i = 0; i < 100; i++) total = addMoney(total, money('0.01'))
    expect(total).toBe('1.00')
  })

  it('produces negative results rather than clamping', () => {
    const loss = subtractMoney(money('30000'), money('50000'))
    expect(loss).toBe('-20000.00')
    expect(isPositive(loss)).toBe(false)
  })

  it('computes the damage margin from the brief', () => {
    // 30k repair charged out at 50k is a 20k gain, not a 20k cost.
    const netImpact = subtractMoney(money('50000'), money('30000'))
    expect(netImpact).toBe('20000.00')
    expect(isPositive(netImpact)).toBe(true)
  })
})

describe('formatPKR', () => {
  it('renders rupees', () => {
    const out = formatPKR(money('31503.50'))
    expect(out).toMatch(/31,503/)
  })
})
