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
type MediaItem = { id: string; mediaType: string; mimeType: string | null; url: string }

/** Local-time "YYYY-MM-DDTHH:mm" for datetime-local min attributes. */
function nowLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

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
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [vehicleMedia, setVehicleMedia] = useState<MediaItem[] | null>(null)

  // min= is computed after mount: the server-rendered HTML can't know the
  // browser's clock, and a mismatched attribute trips hydration warnings.
  const [minStart, setMinStart] = useState('')
  useEffect(() => {
    setMinStart(nowLocal())
  }, [])

  // Each field validates on its own the moment it has a value, so the two
  // dates can be entered in either order — the return field complains about
  // being in the past even while pick-up is still empty.
  const dateIssues = useMemo(() => {
    const issues: { start?: string; end?: string } = {}
    const now = Date.now()
    const start = startAt ? +new Date(startAt) : NaN
    const end = endAt ? +new Date(endAt) : NaN
    if (startAt && !Number.isNaN(start) && start <= now - 60_000) {
      issues.start = 'Pick-up must be in the future'
    }
    if (endAt && !Number.isNaN(end)) {
      if (end <= now) issues.end = 'Return must be in the future'
      else if (!Number.isNaN(start) && end <= start) issues.end = 'Return must be after pick-up'
    }
    return issues
  }, [startAt, endAt])
  const datesValid = Boolean(startAt && endAt && !dateIssues.start && !dateIssues.end)

  // The photos and video captured when the car was registered, shown so the
  // agent can walk the customer through what they're booking.
  useEffect(() => {
    if (!selectedVehicleId) {
      setVehicleMedia(null)
      return
    }
    let stale = false
    setVehicleMedia(null)
    fetch(`/api/media?vehicleId=${selectedVehicleId}`)
      .then((res) => res.json())
      .then((body) => {
        if (!stale) setVehicleMedia(body.ok ? body.data : [])
      })
      .catch(() => {
        if (!stale) setVehicleMedia([])
      })
    return () => {
      stale = true
    }
  }, [selectedVehicleId])

  // Arriving from the timeline with a day already chosen: check availability
  // straight away so the agent lands one click from confirming.
  const autoChecked = useRef(false)
  const prefillApplied = useRef(false)
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
    const list: Vehicle[] = body.ok ? body.data : []
    setAvailable(list)
    // Apply the timeline's vehicle prefill once, on the first check only — a
    // later re-check must not override a choice the agent has since made.
    if (!prefillApplied.current) {
      prefillApplied.current = true
      if (initialVehicleId && list.some((v) => v.id === initialVehicleId)) {
        setSelectedVehicleId(initialVehicleId)
      }
    }
    setChecking(false)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!datesValid) return
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
              min={minStart || undefined}
              aria-invalid={dateIssues.start ? true : undefined}
              onChange={(e) => {
                setStartAt(e.target.value)
                setAvailable(null)
              }}
            />
            {dateIssues.start && <p className="text-xs text-destructive">{dateIssues.start}</p>}
          </Field>

          <Field label="Return">
            <Input
              type="datetime-local"
              required
              value={endAt}
              min={startAt || minStart || undefined}
              aria-invalid={dateIssues.end ? true : undefined}
              onChange={(e) => {
                setEndAt(e.target.value)
                setAvailable(null)
              }}
            />
            {dateIssues.end && <p className="text-xs text-destructive">{dateIssues.end}</p>}
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
            disabled={!datesValid || checking}
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
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
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

        {selectedVehicleId && vehicleMedia !== null && vehicleMedia.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Vehicle photos & video</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {vehicleMedia.map((m) =>
                m.mediaType === 'video' ? (
                  <video
                    key={m.id}
                    src={m.url}
                    controls
                    preload="metadata"
                    className="aspect-video w-full rounded-md border object-cover"
                  />
                ) : (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable */}
                    <img
                      src={m.url}
                      alt="Vehicle"
                      className="aspect-video w-full rounded-md border object-cover"
                    />
                  </a>
                )
              )}
            </div>
          </div>
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
        <Button type="submit" disabled={pending || !datesValid}>
          {pending ? 'Creating…' : 'Create booking'}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href="/bookings">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
