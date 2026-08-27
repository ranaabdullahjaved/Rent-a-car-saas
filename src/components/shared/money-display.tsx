import { formatPKR, type Money } from '@/lib/money'

export function MoneyDisplay({ value, className }: { value: Money; className?: string }) {
  return <span className={className}>{formatPKR(value)}</span>
}
