'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { recordExpenseAction } from '@/lib/modules/finance/finance.actions'
import {
  RECORDABLE_EXPENSE_CATEGORIES,
  isVehicleAttributable,
} from '@/lib/modules/finance/expense.validation'
import { PAYMENT_METHODS } from '@/lib/modules/finance/finance.validation'
import { categoryLabel } from '@/lib/modules/finance/ledger.categories'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

type Options = {
  vehicles: { id: string; registrationNo: string; make: string; model: string }[]
  employees: { id: string; name: string; designation: string | null }[]
  vendors: { id: string; name: string }[]
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function ExpenseForm({ options }: { options: Options }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('office')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const needsVehicle = isVehicleAttributable(category)
  const needsEmployee = category === 'salary'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const result = await recordExpenseAction(new FormData(event.currentTarget))
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    event.currentTarget.reset()
    setCategory('office')
    setPending(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>Record expense</Button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="w-full rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">Record an expense</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Category">
          <select
            name="category"
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {RECORDABLE_EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount (PKR)">
          <Input name="amount" required inputMode="decimal" placeholder="0.00" />
        </Field>

        <Field label="Date">
          <Input
            name="expenseDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        {needsVehicle && (
          <Field label="Vehicle">
            <select name="vehicleId" className={selectClass} defaultValue="">
              <option value="">Select a vehicle…</option>
              {options.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} · {v.make} {v.model}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Required — otherwise this cost becomes overhead and flatters every car&rsquo;s profit.
            </p>
          </Field>
        )}

        {needsEmployee && (
          <Field label="Employee">
            <select name="employeeId" className={selectClass} defaultValue="">
              <option value="">Select an employee…</option>
              {options.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.designation ? ` · ${e.designation}` : ''}
                </option>
              ))}
            </select>
            {options.employees.length === 0 && (
              <p className="text-xs text-muted-foreground">No employees on record yet.</p>
            )}
          </Field>
        )}

        <Field label="Paid to">
          <Input name="paidTo" placeholder="Workshop, landlord, station" />
        </Field>

        <Field label="Method">
          <select name="paymentMethod" className={selectClass} defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Description">
            <Input name="description" placeholder="What this was for" />
          </Field>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Recording…' : 'Record expense'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
