'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { OWNERSHIP_TYPES, VEHICLE_STATUSES } from '@/lib/modules/fleet/fleet.validation'
import { cn } from '@/lib/utils'

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function FleetFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  // Filters live in the URL so a filtered fleet view survives a refresh and
  // can be sent to someone else.
  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.replace(`/fleet?${next.toString()}`))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', pending && 'opacity-60')}>
      <Input
        name="q"
        defaultValue={params.get('q') ?? ''}
        placeholder="Search registration, make or model"
        className="w-64"
        onChange={(e) => apply('q', e.target.value)}
        aria-label="Search fleet"
      />

      <select
        className={selectClass}
        defaultValue={params.get('status') ?? ''}
        onChange={(e) => apply('status', e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {VEHICLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={params.get('ownershipType') ?? ''}
        onChange={(e) => apply('ownershipType', e.target.value)}
        aria-label="Filter by ownership"
      >
        <option value="">All ownership</option>
        {OWNERSHIP_TYPES.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={`${params.get('sort') ?? 'createdAt'}:${params.get('dir') ?? 'desc'}`}
        onChange={(e) => {
          const [sort, dir] = e.target.value.split(':')
          const next = new URLSearchParams(params.toString())
          next.set('sort', sort!)
          next.set('dir', dir!)
          startTransition(() => router.replace(`/fleet?${next.toString()}`))
        }}
        aria-label="Sort"
      >
        <option value="createdAt:desc">Newest first</option>
        <option value="registrationNo:asc">Registration A–Z</option>
        <option value="modelYear:desc">Newest model year</option>
        <option value="currentOdometer:desc">Highest mileage</option>
      </select>
    </div>
  )
}
