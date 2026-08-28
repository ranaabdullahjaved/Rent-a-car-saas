'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  recordChallanAction,
  recordDamageAction,
} from '@/lib/modules/incident/incident.actions'
import {
  CHALLAN_LIABILITY,
  DAMAGE_FAULT,
  DAMAGE_SEVERITIES,
} from '@/lib/modules/incident/incident.validation'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function IncidentPanel({
  bookingId,
  vehicleId,
}: {
  bookingId: string
  vehicleId: string | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'damage' | 'challan'>('damage')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!vehicleId) {
    return (
      <section className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        Assign a vehicle to this booking before recording damage or a challan against it.
      </section>
    )
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    action: (f: FormData) => Promise<{ ok: boolean; message?: string }>
  ) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set('bookingId', bookingId)
    form.set('vehicleId', vehicleId!)

    const result = await action(form)
    if (!result.ok) {
      setError(result.message ?? 'Something went wrong.')
      setPending(false)
      return
    }
    event.currentTarget.reset()
    setPending(false)
    router.refresh()
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-1">
        {(['damage', 'challan'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              setError(null)
            }}
            className={
              tab === t
                ? 'rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground'
                : 'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          >
            {t === 'damage' ? 'Record damage' : 'Record challan'}
          </button>
        ))}
      </div>

      {tab === 'damage' ? (
        <form onSubmit={(e) => submit(e, recordDamageAction)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="What happened">
              <Input name="description" required placeholder="Rear bumper and tail light" />
            </Field>
          </div>
          <Field label="Severity">
            <select name="severity" className={selectClass} defaultValue="minor">
              {DAMAGE_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="At fault">
            <select name="atFault" className={selectClass} defaultValue="customer">
              {DAMAGE_FAULT.map((f) => (
                <option key={f} value={f}>
                  {f.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Repair cost (PKR)">
            <Input name="actualRepairCost" inputMode="decimal" placeholder="30000" />
          </Field>
          <Field label="Charge the customer (PKR)">
            <Input name="amountChargedToCustomer" inputMode="decimal" placeholder="50000" />
          </Field>
          <Field label="Days off the road">
            <Input name="downtimeDays" inputMode="decimal" defaultValue="0" />
          </Field>
          <Field label="Location">
            <Input name="location" placeholder="Where it happened" />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-3 text-xs text-muted-foreground">
              The amount charged is independent of the repair cost — charging more than the repair
              is a gain, charging less means absorbing the difference. Whatever you charge is added
              to the booking balance.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? 'Recording…' : 'Record damage'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => submit(e, recordChallanAction)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Challan number">
            <Input name="challanNo" placeholder="Optional" />
          </Field>
          <Field label="Violation">
            <Input name="violationType" placeholder="Over-speeding" />
          </Field>
          <Field label="When">
            <Input name="violationAt" type="datetime-local" required />
          </Field>
          <Field label="Liability">
            <select name="liability" className={selectClass} defaultValue="customer">
              {CHALLAN_LIABILITY.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (PKR)">
            <Input name="amount" required inputMode="decimal" placeholder="2000" />
          </Field>
          <Field label="Late surcharge (PKR)">
            <Input name="lateSurcharge" inputMode="decimal" placeholder="0" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Recording…' : 'Record challan'}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
