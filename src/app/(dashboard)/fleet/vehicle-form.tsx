'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createVehicleAction, updateVehicleAction } from '@/lib/modules/fleet/fleet.actions'
import {
  FUEL_TYPES,
  OWNERSHIP_TYPES,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
} from '@/lib/modules/fleet/fleet.validation'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export type VehicleFormValues = {
  id?: string
  registrationNo?: string
  make?: string
  model?: string
  variant?: string | null
  modelYear?: number | null
  colour?: string | null
  chassisNo?: string | null
  engineNo?: string | null
  transmission?: string | null
  fuelType?: string | null
  engineCc?: number | null
  seatingCapacity?: number | null
  ownershipType?: string
  investorId?: string | null
  currentOdometer?: number
  status?: string
  notes?: string | null
}

type Props = {
  investors: { id: string; name: string }[]
  initial?: VehicleFormValues
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function VehicleForm({ investors, initial }: Props) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [ownership, setOwnership] = useState(initial?.ownershipType ?? 'company')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const result = isEdit
      ? await updateVehicleAction(initial!.id!, form)
      : await createVehicleAction(form)

    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }

    router.push(`/fleet/${result.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <section className="rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-medium">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration number">
            <Input
              name="registrationNo"
              required
              defaultValue={initial?.registrationNo ?? ''}
              placeholder="LEA-01-1234"
            />
          </Field>
          <Field label="Status">
            <select name="status" className={selectClass} defaultValue={initial?.status ?? 'available'}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Make">
            <Input name="make" required defaultValue={initial?.make ?? ''} placeholder="Toyota" />
          </Field>
          <Field label="Model">
            <Input name="model" required defaultValue={initial?.model ?? ''} placeholder="Corolla" />
          </Field>
          <Field label="Variant">
            <Input name="variant" defaultValue={initial?.variant ?? ''} placeholder="GLi" />
          </Field>
          <Field label="Model year">
            <Input
              name="modelYear"
              type="number"
              inputMode="numeric"
              defaultValue={initial?.modelYear ?? ''}
              placeholder="2022"
            />
          </Field>
          <Field label="Colour">
            <Input name="colour" defaultValue={initial?.colour ?? ''} placeholder="White" />
          </Field>
          <Field label="Current odometer (km)">
            <Input
              name="currentOdometer"
              type="number"
              inputMode="numeric"
              defaultValue={initial?.currentOdometer ?? 0}
            />
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-medium">Ownership</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owned by">
            <select
              name="ownershipType"
              className={selectClass}
              value={ownership}
              onChange={(e) => setOwnership(e.target.value)}
            >
              {OWNERSHIP_TYPES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          {ownership === 'investor' && (
            <Field label="Investor">
              <select name="investorId" className={selectClass} defaultValue={initial?.investorId ?? ''}>
                <option value="">Select an investor…</option>
                {investors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {investors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No investors yet —{' '}
                  <Link href="/investors" className="underline underline-offset-4">
                    add one first
                  </Link>
                  .
                </p>
              )}
            </Field>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-lg border p-5">
        <h2 className="mb-4 text-sm font-medium">Specification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Transmission">
            <select
              name="transmission"
              className={selectClass}
              defaultValue={initial?.transmission ?? ''}
            >
              <option value="">Not set</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fuel type">
            <select name="fuelType" className={selectClass} defaultValue={initial?.fuelType ?? ''}>
              <option value="">Not set</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Engine (cc)">
            <Input name="engineCc" type="number" inputMode="numeric" defaultValue={initial?.engineCc ?? ''} />
          </Field>
          <Field label="Seats">
            <Input
              name="seatingCapacity"
              type="number"
              inputMode="numeric"
              defaultValue={initial?.seatingCapacity ?? ''}
            />
          </Field>
          <Field label="Chassis number">
            <Input name="chassisNo" defaultValue={initial?.chassisNo ?? ''} />
          </Field>
          <Field label="Engine number">
            <Input name="engineNo" defaultValue={initial?.engineNo ?? ''} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={initial?.notes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add vehicle'}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href={isEdit ? `/fleet/${initial!.id}` : '/fleet'}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
