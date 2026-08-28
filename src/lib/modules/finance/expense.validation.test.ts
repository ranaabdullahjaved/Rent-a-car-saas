import { describe, expect, it } from 'vitest'
import {
  RECORDABLE_EXPENSE_CATEGORIES,
  isVehicleAttributable,
  recordExpenseSchema,
} from './expense.validation'
import { EXPENSE_CATEGORY_KEYS, isIncomeCategory } from './ledger.categories'

const base = { category: 'office', amount: '15000', expenseDate: '2026-08-28' }

describe('vehicle attribution', () => {
  it('requires a vehicle for costs that belong to a car', () => {
    // Per-car profit is only meaningful if the car's costs are attached to it.
    for (const category of ['maintenance', 'fuel', 'challan_paid', 'instalment']) {
      const parsed = recordExpenseSchema.safeParse({ ...base, category })
      expect(parsed.success, `${category} should require a vehicle`).toBe(false)
      if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['vehicleId'])
    }
  })

  it('accepts those costs once a vehicle is chosen', () => {
    expect(
      recordExpenseSchema.safeParse({ ...base, category: 'maintenance', vehicleId: '3' }).success
    ).toBe(true)
  })

  it('does not demand a vehicle for genuine overheads', () => {
    for (const category of ['office', 'other_expense']) {
      expect(recordExpenseSchema.safeParse({ ...base, category }).success).toBe(true)
    }
  })

  it('agrees with the helper used by the form', () => {
    expect(isVehicleAttributable('maintenance')).toBe(true)
    expect(isVehicleAttributable('office')).toBe(false)
  })
})

describe('salary', () => {
  it('requires the employee it is for', () => {
    const parsed = recordExpenseSchema.safeParse({ ...base, category: 'salary' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['employeeId'])
  })

  it('is accepted with an employee', () => {
    expect(recordExpenseSchema.safeParse({ ...base, category: 'salary', employeeId: '2' }).success).toBe(
      true
    )
  })
})

describe('categories', () => {
  it('only offers real ledger expense categories', () => {
    for (const c of RECORDABLE_EXPENSE_CATEGORIES) {
      expect(EXPENSE_CATEGORY_KEYS).toContain(c)
      expect(isIncomeCategory(c)).toBe(false)
    }
  })

  it('excludes the ones other modules compute', () => {
    // Recording these by hand would bypass the module that knows how to
    // calculate them, and produce a figure nobody can reconcile.
    expect(RECORDABLE_EXPENSE_CATEGORIES).not.toContain('investor_payout')
    expect(RECORDABLE_EXPENSE_CATEGORIES).not.toContain('deposit_refund')
  })

  it('rejects a category outside the taxonomy', () => {
    expect(recordExpenseSchema.safeParse({ ...base, category: 'bribes' }).success).toBe(false)
  })
})

describe('amounts and dates', () => {
  it('rejects zero and negative expenses', () => {
    expect(recordExpenseSchema.safeParse({ ...base, amount: '0' }).success).toBe(false)
    expect(recordExpenseSchema.safeParse({ ...base, amount: '-100' }).success).toBe(false)
  })

  it('requires a real date', () => {
    expect(recordExpenseSchema.safeParse({ ...base, expenseDate: '28-08-2026' }).success).toBe(false)
    expect(recordExpenseSchema.safeParse({ ...base, expenseDate: '' }).success).toBe(false)
  })

  it('keeps the date as a string, since the column is a date not a timestamp', () => {
    const parsed = recordExpenseSchema.parse(base)
    expect(parsed.expenseDate).toBe('2026-08-28')
    expect(typeof parsed.expenseDate).toBe('string')
  })

  it('treats a checkbox value as recurring', () => {
    expect(recordExpenseSchema.parse({ ...base, isRecurring: 'on' }).isRecurring).toBe(true)
    expect(recordExpenseSchema.parse(base).isRecurring).toBe(false)
  })
})
