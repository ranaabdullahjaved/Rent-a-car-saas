'use client'

import { useRef, useState } from 'react'
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

type Upload = {
  key: string
  mediaType: 'photo' | 'video'
  mimeType: string
  previewUrl: string
  name: string
}

export function VehicleForm({ investors, initial }: Props) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [ownership, setOwnership] = useState(initial?.ownershipType ?? 'company')

  const [uploads, setUploads] = useState<Upload[]>([])
  const [uploadBusy, setUploadBusy] = useState(0)
  // One batch id per form open, so this vehicle's files land together in R2.
  const batchId = useRef('')
  if (!batchId.current) {
    batchId.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Math.trunc(Math.random() * 1e12))
  }

  // Files go straight from the browser to R2 with a presigned PUT — Vercel
  // caps request bodies well below the size of a phone video.
  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploadBusy((n) => n + files.length)
    for (const file of Array.from(files)) {
      try {
        const ticketRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: batchId.current,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
          }),
        })
        const ticket = await ticketRes.json()
        if (!ticket.ok) throw new Error(ticket.message ?? 'Could not start the upload')

        const put = await fetch(ticket.data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!put.ok) throw new Error(`Upload failed (${put.status})`)

        setUploads((prev) => [
          ...prev,
          {
            key: ticket.data.key,
            mediaType: file.type.startsWith('video/') ? 'video' : 'photo',
            mimeType: file.type,
            previewUrl: URL.createObjectURL(file),
            name: file.name,
          },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploadBusy((n) => n - 1)
      }
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isEdit && uploads.length === 0) {
      setError('Add at least one photo or a video of the vehicle before saving it.')
      return
    }
    if (uploadBusy > 0) return
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set(
      'uploadedMedia',
      uploads.map((u) => `${u.key}::${u.mediaType}::${u.mimeType}`).join('|')
    )
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
      <section className="rounded-xl border bg-card p-5 shadow-sm">
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

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
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

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
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

      <section className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium">
          Photos & video{isEdit ? '' : ' (required)'}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {isEdit
            ? 'Add more photos or a video. Existing media stays as it is.'
            : 'At least one photo or a video is required — this is what customers are shown when booking.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
            <span className="text-lg leading-none">＋</span>
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void uploadFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
            <span className="text-lg leading-none">▶</span>
            Add video
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => {
                void uploadFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          {uploads.map((u) => (
            <div key={u.key} className="relative h-24 w-32 overflow-hidden rounded-md border">
              {u.mediaType === 'video' ? (
                <video src={u.previewUrl} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img src={u.previewUrl} alt={u.name} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                aria-label={`Remove ${u.name}`}
                className="absolute right-1 top-1 rounded-full bg-background/80 px-1.5 text-xs leading-5 shadow"
                onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))}
              >
                ✕
              </button>
            </div>
          ))}
          {uploadBusy > 0 && (
            <div className="flex h-24 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
              Uploading…
            </div>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending || uploadBusy > 0}>
          {pending ? 'Saving…' : uploadBusy > 0 ? 'Uploading media…' : isEdit ? 'Save changes' : 'Add vehicle'}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href={isEdit ? `/fleet/${initial!.id}` : '/fleet'}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
