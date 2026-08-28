'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addChargeAction,
  promiseToPayAction,
  recordPaymentAction,
} from '@/lib/modules/finance/finance.actions'
import { PAYMENT_METHODS, PAYMENT_PURPOSES } from '@/lib/modules/finance/finance.validation'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const CHARGE_TYPES = [
  'rental',
  'driver',
  'extra_km',
  'late_fee',
  'fuel',
  'damage',
  'challan',
  'cleaning',
  'other',
] as const

type Tab = 'payment' | 'charge' | 'promise'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function MoneyPanel({ bookingId, balanceDue }: { bookingId: string; balanceDue: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('payment')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    action: (f: FormData) => Promise<{ ok: boolean; message?: string }>
  ) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set('bookingId', bookingId)
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'payment', label: 'Take payment' },
    { key: 'charge', label: 'Add charge' },
    { key: 'promise', label: 'Promise to pay' },
  ]

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key)
              setError(null)
            }}
            className={
              tab === t.key
                ? 'rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground'
                : 'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'payment' && (
        <form onSubmit={(e) => submit(e, recordPaymentAction)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (PKR)">
            <Input
              name="amount"
              required
              inputMode="decimal"
              defaultValue={Number(balanceDue) > 0 ? balanceDue : ''}
              placeholder="0.00"
            />
          </Field>
          <Field label="Method">
            <select name="method" className={selectClass} defaultValue="cash">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="For">
            <select name="purpose" className={selectClass} defaultValue="booking">
              {PAYMENT_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference number">
            <Input name="referenceNo" placeholder="Transaction ID, cheque no." />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-3 text-xs text-muted-foreground">
              A security deposit is recorded as a refundable hold — it does not reduce the balance
              owed and is not counted as income.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? 'Recording…' : 'Record payment'}
            </Button>
          </div>
        </form>
      )}

      {tab === 'charge' && (
        <form onSubmit={(e) => submit(e, addChargeAction)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Charge type">
            <select name="chargeType" className={selectClass} defaultValue="rental">
              {CHARGE_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <Input name="description" placeholder="Optional" />
          </Field>
          <Field label="Quantity">
            <Input name="quantity" inputMode="decimal" defaultValue="1" />
          </Field>
          <Field label="Unit amount (PKR)">
            <Input name="unitAmount" required inputMode="decimal" placeholder="0.00" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding…' : 'Add charge'}
            </Button>
          </div>
        </form>
      )}

      {tab === 'promise' && (
        <form onSubmit={(e) => submit(e, promiseToPayAction)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount promised (PKR)">
            <Input
              name="promisedAmount"
              required
              inputMode="decimal"
              defaultValue={Number(balanceDue) > 0 ? balanceDue : ''}
            />
          </Field>
          <Field label="Promised date">
            <Input name="promisedDate" type="date" required />
          </Field>
          <Field label="Notes">
            <Input name="notes" placeholder="What the customer said" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Record promise'}
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
