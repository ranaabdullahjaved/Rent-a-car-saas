'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionResult,
} from '@/lib/modules/customer/customer.actions'
import {
  CUSTOMER_TYPES,
  RISK_RATINGS,
  formatCnic,
} from '@/lib/modules/customer/customer.validation'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export type CustomerFormValues = {
  id?: string
  fullName?: string
  fatherName?: string | null
  cnic?: string | null
  phone?: string
  altPhone?: string | null
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  licenseNo?: string | null
  licenseExpiry?: string | null
  referenceName?: string | null
  referencePhone?: string | null
  customerType?: string
  riskRating?: string
  blacklistReason?: string | null
  notes?: string | null
}

type Duplicate = { id: string; fullName: string; phone: string; cnic: string | null }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function CustomerForm({ initial }: { initial?: CustomerFormValues }) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null)
  const [pending, setPending] = useState(false)
  const [risk, setRisk] = useState(initial?.riskRating ?? 'normal')

  function handle(result: CustomerActionResult) {
    if ('duplicates' in result) {
      setDuplicates(result.duplicates)
      setPending(false)
      return
    }
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    router.push(`/customers/${result.id}`)
    router.refresh()
  }

  async function submit(form: FormData, force: boolean) {
    setError(null)
    setPending(true)
    handle(
      isEdit
        ? await updateCustomerAction(initial!.id!, form)
        : await createCustomerAction(form, { force })
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDuplicates(null)
    await submit(new FormData(event.currentTarget), false)
  }

  // Kept so "add anyway" can resubmit the same values without retyping.
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null)

  return (
    <form ref={setFormEl} onSubmit={onSubmit} className="max-w-3xl">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input name="fullName" required defaultValue={initial?.fullName ?? ''} />
          </Field>
          <Field label="Father's name">
            <Input name="fatherName" defaultValue={initial?.fatherName ?? ''} />
          </Field>
          <Field label="CNIC">
            <Input
              name="cnic"
              defaultValue={formatCnic(initial?.cnic ?? null) ?? ''}
              placeholder="35201-1234567-1"
              inputMode="numeric"
            />
          </Field>
          <Field label="Customer type">
            <select
              name="customerType"
              className={selectClass}
              defaultValue={initial?.customerType ?? 'individual'}
            >
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input
              name="phone"
              required
              defaultValue={initial?.phone ?? ''}
              placeholder="0300 1234567"
              type="tel"
            />
          </Field>
          <Field label="WhatsApp">
            <Input name="whatsapp" defaultValue={initial?.whatsapp ?? ''} type="tel" />
          </Field>
          <Field label="Alternate phone">
            <Input name="altPhone" defaultValue={initial?.altPhone ?? ''} type="tel" />
          </Field>
          <Field label="Email">
            <Input name="email" defaultValue={initial?.email ?? ''} type="email" />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={initial?.city ?? ''} placeholder="Lahore" />
          </Field>
          <Field label="Address">
            <Input name="address" defaultValue={initial?.address ?? ''} />
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Driving licence and reference</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Licence number">
            <Input name="licenseNo" defaultValue={initial?.licenseNo ?? ''} />
          </Field>
          <Field label="Licence expiry">
            <Input name="licenseExpiry" type="date" defaultValue={initial?.licenseExpiry ?? ''} />
          </Field>
          <Field label="Reference name">
            <Input name="referenceName" defaultValue={initial?.referenceName ?? ''} />
          </Field>
          <Field label="Reference phone">
            <Input name="referencePhone" defaultValue={initial?.referencePhone ?? ''} type="tel" />
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Risk</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating">
            <select
              name="riskRating"
              className={selectClass}
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            >
              {RISK_RATINGS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          {risk === 'blacklisted' && (
            <Field label="Reason for blacklisting">
              <Input
                name="blacklistReason"
                required
                defaultValue={initial?.blacklistReason ?? ''}
                placeholder="Damaged vehicle and refused to pay"
              />
            </Field>
          )}
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

      {duplicates && duplicates.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40"
        >
          <p className="font-medium">This might already be in your customers</p>
          <p className="mt-1 text-muted-foreground">
            Adding a second record splits their booking history and outstanding dues.
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/customers/${d.id}`} className="underline underline-offset-4">
                  {d.fullName}
                </Link>
                <span className="text-muted-foreground">
                  {' · '}
                  {d.phone}
                  {d.cnic ? ` · ${formatCnic(d.cnic)}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={() => formEl && submit(new FormData(formEl), true)}
          >
            This is someone else — add anyway
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href={isEdit ? `/customers/${initial!.id}` : '/customers'}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
