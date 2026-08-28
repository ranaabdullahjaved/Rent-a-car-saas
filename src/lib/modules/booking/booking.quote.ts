import { ZERO, addMoney, money, multiplyMoney, subtractMoney, type Money } from '@/lib/money'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type QuoteInput = {
  startAt: Date
  endAt: Date
  dailyRate: string
  driverChargePerDay?: string
  bookingType?: string
  securityDeposit?: string
  discountAmount?: string
}

export type QuoteLine = { label: string; detail?: string; amount: Money }

export type Quote = {
  chargeableDays: number
  lines: QuoteLine[]
  /** Rent plus driver charge, less discount. Excludes the refundable deposit. */
  total: Money
  /** What the customer hands over at pick-up, deposit included. */
  dueAtPickup: Money
  deposit: Money
}

/**
 * Rentals are priced per day, and any part of a day is charged as a full day —
 * a car returned at 26 hours has been off the fleet for two days. Minimum one.
 */
export function chargeableDays(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime()
  if (ms <= 0) return 1
  return Math.max(1, Math.ceil(ms / MS_PER_DAY))
}

/**
 * Every figure goes through the Money type. Nothing here touches a JS number
 * except the day count, which is a count and not an amount.
 */
export function buildQuote(input: QuoteInput): Quote {
  const days = chargeableDays(input.startAt, input.endAt)
  const rate = money(input.dailyRate || '0')
  const rent = multiplyMoney(rate, days)

  const lines: QuoteLine[] = [
    { label: 'Rental', detail: `${days} day${days === 1 ? '' : 's'} at ${rate}`, amount: rent },
  ]

  let total = rent

  const driverRate = money(input.driverChargePerDay || '0')
  if (input.bookingType === 'with_driver' && driverRate !== ZERO) {
    const driverTotal = multiplyMoney(driverRate, days)
    lines.push({
      label: 'Driver',
      detail: `${days} day${days === 1 ? '' : 's'} at ${driverRate}`,
      amount: driverTotal,
    })
    total = addMoney(total, driverTotal)
  }

  const discount = money(input.discountAmount || '0')
  if (discount !== ZERO) {
    lines.push({ label: 'Discount', amount: subtractMoney(ZERO, discount) })
    total = subtractMoney(total, discount)
  }

  const deposit = money(input.securityDeposit || '0')

  return {
    chargeableDays: days,
    lines,
    total,
    deposit,
    // The deposit is a refundable hold, not revenue — it is added for what the
    // customer pays at pick-up but never folded into the booking total.
    dueAtPickup: addMoney(total, deposit),
  }
}
