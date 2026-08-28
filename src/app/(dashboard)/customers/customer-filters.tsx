'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { CUSTOMER_TYPES, RISK_RATINGS } from '@/lib/modules/customer/customer.validation'
import { cn } from '@/lib/utils'

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function CustomerFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.replace(`/customers?${next.toString()}`))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', pending && 'opacity-60')}>
      <Input
        defaultValue={params.get('q') ?? ''}
        placeholder="Search name, phone or CNIC"
        className="w-72"
        onChange={(e) => apply('q', e.target.value)}
        aria-label="Search customers"
      />

      <select
        className={selectClass}
        defaultValue={params.get('riskRating') ?? ''}
        onChange={(e) => apply('riskRating', e.target.value)}
        aria-label="Filter by risk rating"
      >
        <option value="">All ratings</option>
        {RISK_RATINGS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={params.get('customerType') ?? ''}
        onChange={(e) => apply('customerType', e.target.value)}
        aria-label="Filter by customer type"
      >
        <option value="">All types</option>
        {CUSTOMER_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  )
}
