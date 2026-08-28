'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAgreementAction } from '@/lib/modules/investor/agreement.actions'
import {
  AGREEMENT_TYPES,
  AGREEMENT_TYPE_LABELS,
  SETTLEMENT_CYCLES,
} from '@/lib/modules/investor/agreement.validation'

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

export function AgreementForm({
  investorId,
  vehicles,
}: {
  investorId: string
  vehicles: { id: string; registrationNo: string; make: string; model: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('revenue_share')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isFixed = type === 'fixed_rent'
  const isProfit = type === 'profit_share'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set('investorId', investorId)

    const result = await createAgreementAction(form)
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    event.currentTarget.reset()
    setPending(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Add agreement</Button>

  return (
    <form onSubmit={onSubmit} className="mt-4 w-full rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">New agreement</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle">
          <select name="vehicleId" className={selectClass} required defaultValue="">
            <option value="" disabled>
              Select a vehicle…
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNo} · {v.make} {v.model}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Deal type">
          <select
            name="agreementType"
            className={selectClass}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {AGREEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {AGREEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        {isFixed ? (
          <Field label="Monthly rent (PKR)">
            <Input name="fixedMonthlyAmount" required inputMode="decimal" placeholder="45000" />
          </Field>
        ) : (
          <Field label="Investor's share (%)">
            <Input name="sharePercent" required inputMode="decimal" placeholder="60" />
          </Field>
        )}

        <Field label="Settlement cycle">
          <select name="settlementCycle" className={selectClass} defaultValue="monthly">
            {SETTLEMENT_CYCLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Effective from">
          <Input name="effectiveFrom" type="date" required />
        </Field>
        <Field label="Effective to">
          <Input name="effectiveTo" type="date" />
          <p className="text-xs text-muted-foreground">Leave blank for open-ended.</p>
        </Field>
      </div>

      {isProfit && (
        <fieldset className="mt-4 rounded-md border p-4">
          <legend className="px-1 text-xs text-muted-foreground">
            Which costs come off before the investor&rsquo;s share
          </legend>
          <div className="flex flex-col gap-2">
            {[
              ['investorAbsorbsMaintenance', 'Maintenance and fuel'],
              ['investorAbsorbsDamage', 'Damage repairs'],
              ['investorAbsorbsChallans', 'Traffic challans'],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={name} className="size-4" />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Only applies to a profit share. A revenue share is a slice of the top line, so nothing
            is deducted.
          </p>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add agreement'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
