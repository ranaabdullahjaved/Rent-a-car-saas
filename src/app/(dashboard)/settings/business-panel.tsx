'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateBusinessDefaultsAction } from '@/lib/modules/team/team.actions'

export function BusinessPanel({
  name,
  defaultBufferMinutes,
  fuelRatePerLitre,
}: {
  name: string
  defaultBufferMinutes: number
  fuelRatePerLitre: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setPending(true)
    const result = await updateBusinessDefaultsAction(new FormData(event.currentTarget))
    if (!result.ok) setError(result.message)
    else setSaved(true)
    setPending(false)
    router.refresh()
  }

  return (
    <section className="animate-enter rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">Business</h2>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">
        Defaults every new booking and check-in starts from.
      </p>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 sm:col-span-3">
          <Label>Business name</Label>
          <Input name="name" required defaultValue={name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Turnaround buffer (minutes)</Label>
          <Input
            name="defaultBufferMinutes"
            type="number"
            inputMode="numeric"
            defaultValue={defaultBufferMinutes}
          />
          <p className="text-xs text-muted-foreground">Cleaning time between bookings.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Fuel rate (PKR / litre)</Label>
          <Input name="fuelRatePerLitre" inputMode="decimal" defaultValue={fuelRatePerLitre} />
          <p className="text-xs text-muted-foreground">Prices fuel shortfalls at check-in.</p>
        </div>
        <div className="flex items-end gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="pb-2 text-xs text-success">Saved</span>}
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
