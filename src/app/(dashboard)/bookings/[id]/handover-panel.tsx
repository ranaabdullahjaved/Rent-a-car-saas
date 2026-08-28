'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  recordHandoverAction,
  requestUploadTicket,
} from '@/lib/modules/handover/handover.actions'
import {
  ANGLE_LABELS,
  FUEL_EIGHTHS,
  REQUIRED_ANGLES,
  fuelLabel,
} from '@/lib/modules/handover/handover.validation'
import { cn } from '@/lib/utils'

type Captured = { angle: string; key: string; mediaType: string; mimeType: string }

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

export function HandoverPanel({
  bookingId,
  hasVehicle,
  stage,
}: {
  bookingId: string
  hasVehicle: boolean
  stage: 'checkout' | 'checkin' | 'done'
}) {
  const router = useRouter()
  const [captured, setCaptured] = useState<Captured[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  if (!hasVehicle) {
    return (
      <section className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        Assign a vehicle before checking it out.
      </section>
    )
  }

  if (stage === 'done') {
    return (
      <section className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        This vehicle has been checked out and back in. The handover record is below.
      </section>
    )
  }

  const capturedAngles = new Set(captured.map((c) => c.angle))
  const missing = REQUIRED_ANGLES.filter((a) => !capturedAngles.has(a))

  async function onPick(angle: string, file: File | undefined) {
    if (!file) return
    setError(null)
    setUploading(angle)

    const ticket = await requestUploadTicket({
      bookingId,
      angle,
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
    })

    if (!ticket.ok) {
      setError(ticket.message)
      setUploading(null)
      return
    }

    try {
      // Straight to R2 — this file never touches the app server.
      const res = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type || 'image/jpeg' },
      })
      if (!res.ok) throw new Error(`upload failed with ${res.status}`)

      setCaptured((prev) => [
        ...prev.filter((c) => c.angle !== angle),
        {
          angle,
          key: ticket.key,
          mediaType: file.type.startsWith('video/') ? 'video' : 'photo',
          mimeType: file.type || 'image/jpeg',
        },
      ])
    } catch {
      setError(`Could not upload the ${ANGLE_LABELS[angle] ?? angle} photo. Try again.`)
    } finally {
      setUploading(null)
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set('bookingId', bookingId)
    form.set('handoverType', stage)
    form.set('capturedAngles', captured.map((c) => c.angle).join(','))
    form.set(
      'uploadedMedia',
      captured.map((c) => `${c.angle}::${c.key}::${c.mediaType}::${c.mimeType}`).join('|')
    )

    const result = await recordHandoverAction(form)
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    setCaptured([])
    setPending(false)
    router.refresh()
  }

  return (
    <section className="rounded-lg border p-5">
      <h2 className="mb-1 text-sm font-medium">
        {stage === 'checkout' ? 'Check out' : 'Check in'}
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        {stage === 'checkout'
          ? 'Photograph every angle before the car leaves. A missing picture is how a damage claim gets argued away.'
          : 'Re-photograph the same angles so the two can be compared.'}
      </p>

      <form onSubmit={onSubmit}>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REQUIRED_ANGLES.map((angle) => {
            const done = capturedAngles.has(angle)
            const busy = uploading === angle
            return (
              <div key={angle}>
                <input
                  ref={(el) => {
                    inputs.current[angle] = el
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPick(angle, e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => inputs.current[angle]?.click()}
                  disabled={busy}
                  className={cn(
                    'flex h-20 w-full flex-col items-center justify-center gap-1 rounded-md border px-2 text-center text-xs transition-colors',
                    done
                      ? 'border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-dashed text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <span aria-hidden className="text-base">
                    {busy ? '…' : done ? '✓' : '＋'}
                  </span>
                  {ANGLE_LABELS[angle]}
                </button>
              </div>
            )
          })}
        </div>

        <p
          className={cn(
            'mb-4 text-xs',
            missing.length ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {missing.length
            ? `${missing.length} of ${REQUIRED_ANGLES.length} still to photograph`
            : `All ${REQUIRED_ANGLES.length} angles captured`}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Odometer (km)">
            <Input name="odometer" required type="number" inputMode="numeric" placeholder="45000" />
          </Field>
          <Field label="Fuel level">
            <select name="fuelLevelEighths" className={selectClass} defaultValue="8">
              {[...FUEL_EIGHTHS].reverse().map((e) => (
                <option key={e} value={e}>
                  {fuelLabel(e)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exterior condition">
            <Input name="exteriorCondition" placeholder="Scratch on rear bumper" />
          </Field>
          <Field label="Interior condition">
            <Input name="interiorCondition" placeholder="Clean" />
          </Field>
          <Field label="Location">
            <Input name="location" placeholder="Office, Gulberg" />
          </Field>
          <Field label="Notes">
            <Input name="notes" />
          </Field>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5">
          <Button type="submit" disabled={pending || missing.length > 0}>
            {pending
              ? 'Saving…'
              : stage === 'checkout'
                ? 'Complete check-out'
                : 'Complete check-in'}
          </Button>
          {missing.length > 0 && (
            <span className="ml-3 text-xs text-muted-foreground">
              Photograph the remaining angles to continue.
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
