/**
 * The ledger's closed category taxonomy.
 *
 * Every report in the brief — profit per car, investor earnings, outsourcing
 * margin, month-on-month — is the same query over ledger_entries with a
 * different GROUP BY. That only works if categories are a fixed set rather
 * than free text, so they live here and nowhere else.
 */
export const INCOME_CATEGORIES = {
  rental: 'Rental income',
  damage_recovery: 'Damage recovered',
  fuel_recovery: 'Fuel recovered',
  late_fee: 'Late return penalty',
  challan_recovery: 'Challan recovered',
  outsourcing: 'Outsourcing margin',
  insurance_claim: 'Insurance claim',
  vehicle_sale: 'Vehicle sale',
  other_income: 'Other income',
} as const

export const EXPENSE_CATEGORIES = {
  maintenance: 'Maintenance and repairs',
  fuel: 'Fuel',
  salary: 'Salaries',
  investor_payout: 'Investor payout',
  vendor_payment: 'Vendor payment',
  challan_paid: 'Challan paid',
  instalment: 'Vehicle instalment',
  office: 'Office and overheads',
  deposit_refund: 'Security deposit refunded',
  other_expense: 'Other expense',
} as const

export type IncomeCategory = keyof typeof INCOME_CATEGORIES
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES
export type LedgerCategory = IncomeCategory | ExpenseCategory

export const INCOME_CATEGORY_KEYS = Object.keys(INCOME_CATEGORIES) as IncomeCategory[]
export const EXPENSE_CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]

export function categoryLabel(category: string): string {
  return (
    (INCOME_CATEGORIES as Record<string, string>)[category] ??
    (EXPENSE_CATEGORIES as Record<string, string>)[category] ??
    category
  )
}

export function isIncomeCategory(category: string): boolean {
  return category in INCOME_CATEGORIES
}

/** What produced the entry, so a row can always be traced to its origin. */
export const LEDGER_SOURCE_TYPES = [
  'payment',
  'expense',
  'salary',
  'maintenance',
  'damage',
  'challan',
  'investor_payout',
  'booking',
  'adjustment',
] as const

export type LedgerSourceType = (typeof LEDGER_SOURCE_TYPES)[number]
