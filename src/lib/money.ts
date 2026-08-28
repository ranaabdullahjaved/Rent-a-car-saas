import Decimal from 'decimal.js'

// Branded type — a string that has been validated as a decimal number.
// The database returns numeric columns as strings. Never coerce to JS number.
declare const __money: unique symbol
export type Money = string & { readonly [__money]: true }

export function money(value: string | number | Decimal): Money {
  let d: Decimal
  try {
    d = new Decimal(value)
  } catch {
    // decimal.js throws its own DecimalError on unparseable input, which
    // would surface to callers instead of our message. Normalise it.
    throw new Error(`Invalid money value: ${String(value)}`)
  }
  // Catches NaN and ±Infinity, both of which Decimal accepts without throwing.
  if (!d.isFinite()) throw new Error(`Invalid money value: ${String(value)}`)
  return d.toFixed(2) as Money
}

export function addMoney(a: Money, b: Money): Money {
  return money(new Decimal(a).plus(new Decimal(b)))
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(new Decimal(a).minus(new Decimal(b)))
}

export function multiplyMoney(a: Money, factor: number | string): Money {
  return money(new Decimal(a).times(new Decimal(factor)))
}

export function isPositive(a: Money): boolean {
  return new Decimal(a).isPositive()
}

export function formatPKR(value: Money): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(new Decimal(value).toNumber())
}

export const ZERO: Money = '0.00' as Money
