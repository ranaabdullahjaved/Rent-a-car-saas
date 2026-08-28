'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBookingAction } from '@/lib/modules/booking/booking.actions'
import { buildQuote } from '@/lib/modules/booking/booking.quote'
import { BOOKING_TYPES } from '@/lib/modules/booking/booking.validation'
import { formatPKR, money } from '@/lib/money'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

type Vehicle = { id: string; registrationNo: string; make: string; model: string }
type Customer = { id: string; fullName: string; phone: string; riskRating: string }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

type BookingFormProps = {
  customers: Customer[]
  /** Prefill from the timeline: clicked vehicle and day. */
  initialVehicleId?: string
  initialStart?: string
  initialEnd?: string
  /** The tenant's turnaround default from Settings. */
  initialBufferMinutes?: number
}

export function BookingForm({ customers, initialVehicleId, initialStart, initialEnd, initialBufferMinutes }: BookingFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [startAt, setStartAt] = useState(initialStart ?? '')
  const [endAt, setEndAt] = useState(initialEnd ?? '')
  const [bufferMinutes, setBufferMinutes] = useState(String(initialBufferMinutes ?? 0))
  const [bookingType, setBookingType] = useState('self_drive')
  const [dailyRate, setDailyRate] = useState('')
  const [driverCharge, setDriverCharge] = useState('')
  const [discount, setDiscount] = useState('')
  const [deposit, setDeposit] = useState('')

  const [available, setAvailable] = useState<Vehicle[] | null>(null)
  const [checking, setChecking] = useState(false)

  // Arriving from the timeline with a day already chosen: check availability
  // straight away so the agent lands one click from confirming.
  const autoChecked = useRef(false)
  useEffect(() => {
    if (initialStart && initialEnd && !autoChecked.current) {
      autoChecked.current = true
      void checkAvailability()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quote = useMemo(() => {
    if (!startAt || !endAt) return null
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start) return null
    try {
      return buildQuote({
        startAt: start,
        endAt: end,
        dailyRate: dailyRate || '0',
        driverChargePerDay: driverCharge || '0',
        bookingType,
        discountAmount: discount || '0',
        securityDeposit: deposit || '0',
      })
    } catch {
      // An amount mid-typing ("45.") is not yet valid money; show nothing
      // rather than an error the user has not finished causing.
      return null
    }
  }, [startAt, endAt, dailyRate, driverCharge, bookingType, discount, deposit])

  async function checkAvailability() {
    if (!startAt || !endAt) return
    setChecking(true)
    setAvailable(null)
    const params = new URLSearchParams({
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      bufferMinutes: bufferMinutes || '0',
    })
    const res = await fetch(`/api/bookings/availability?${params}`)
    const body = await res.json()
    setAvailable(body.ok ? body.data : [])
    setChecking(false)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    // datetime-local has no timezone; send an explicit instant.
    form.set('startAt', new Date(startAt).toISOString())
    form.set('endAt', new Date(endAt).toISOString())

    const result = await createBookingAction(form)
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      // The window may have been taken while the form was open.
      void checkAvailability()
      return
    }
    router.push(`/bookings/${result.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Customer and dates</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer">
            <select name="customerId" className={selectClass} required defaultValue="">
              <option value="" disabled>
                Select a customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} · {c.phone}
                  {c.riskRating === 'blacklisted' ? ' (blacklisted)' : ''}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No customers yet —{' '}
                <Link href="/customers/new" className="underline underline-offset-4">
                  add one first
                </Link>
                .
              </p>
            )}
          </Field>

          <Field label="Booking type">
            <select
              name="bookingType"
              className={selectClass}
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
            >
              {BOOKING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', '-')}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Pick-up">
            <Input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => {
                setStartAt(e.target.value)
                setAvailable(null)
              }}
            />
          </Field>

          <Field label="Return">
            <Input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => {
                setEndAt(e.target.value)
                setAvailable(null)
              }}
            />
          </Field>

          <Field label="Turnaround buffer (minutes)">
            <Input
              name="bufferMinutes"
              type="number"
              inputMode="numeric"
              value={bufferMinutes}
              onChange={(e) => {
                setBufferMinutes(e.target.value)
                setAvailable(null)
              }}
            />
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Vehicle</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={checkAvailability}
            disabled={!startAt || !endAt || checking}
          >
            {checking ? 'Checking…' : 'Check availability'}
          </Button>
        </div>

        {available === null ? (
          <p className="text-sm text-muted-foreground">
            Set the dates, then check which vehicles are free.
          </p>
        ) : available.length === 0 ? (
          <p className="text-sm text-destructive">
            No vehicles are free for that window. Change the dates, or take the booking as tentative
            and assign a car later.
          </p>
        ) : (
          <Field label="Available vehicles">
            <select
              name="vehicleId"
              className={selectClass}
              defaultValue={
                initialVehicleId && available.some((v) => v.id === initialVehicleId)
                  ? initialVehicleId
                  : ''
              }
            >
              <option value="">No vehicle yet (tentative)</option>
              {available.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} · {v.make} {v.model}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="mt-4">
          <Field label="Status">
            <select name="status" className={selectClass} defaultValue="confirmed">
              <option value="confirmed">Confirmed — reserves the vehicle</option>
              <option value="tentative">Tentative — does NOT reserve the vehicle</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Only confirmed, dispatched and active bookings hold a car. A tentative booking can be
              taken by someone else.
            </p>
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Daily rate (PKR)">
            <Input
              name="dailyRate"
              required
              inputMode="decimal"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              placeholder="4500"
            />
          </Field>
          {bookingType === 'with_driver' && (
            <Field label="Driver charge per day (PKR)">
              <Input
                name="driverChargePerDay"
                inputMode="decimal"
                value={driverCharge}
                onChange={(e) => setDriverCharge(e.target.value)}
                placeholder="1500"
              />
            </Field>
          )}
          <Field label="Discount (PKR)">
            <Input
              name="discountAmount"
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
          <Field label="Security deposit (PKR)">
            <Input
              name="securityDeposit"
              inputMode="decimal"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </Field>
          <Field label="Allowed km per day">
            <Input name="allowedKmPerDay" type="number" inputMode="numeric" />
          </Field>
          <Field label="Late penalty per hour (PKR)">
            <Input name="latePenaltyPerHour" inputMode="decimal" />
          </Field>
        </div>

        {quote && (
          <div className="mt-5 rounded-md border bg-muted/40 p-4">
            <dl className="flex flex-col gap-1.5 text-sm">
              {quote.lines.map((line) => (
                <div key={line.label} className="flex items-baseline justify-between gap-4">
                  <dt>
                    {line.label}
                    {line.detail && (
                      <span className="text-muted-foreground"> · {line.detail}</span>
                    )}
                  </dt>
                  <dd className="tabular-nums">{formatPKR(line.amount)}</dd>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-2 font-medium">
                <dt>Booking total</dt>
                <dd className="tabular-nums">{formatPKR(quote.total)}</dd>
              </div>
              {quote.deposit !== money('0') && (
                <div className="flex items-baseline justify-between gap-4 text-muted-foreground">
                  <dt>Refundable deposit</dt>
                  <dd className="tabular-nums">{formatPKR(quote.deposit)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 font-medium">
                <dt>Due at pick-up</dt>
                <dd className="tabular-nums">{formatPKR(quote.dueAtPickup)}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create booking'}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href="/bookings">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
