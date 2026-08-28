'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createScheduleAction,
  recordJobAction,
} from '@/lib/modules/maintenance/maintenance.actions'
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
} from '@/lib/modules/maintenance/maintenance.validation'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

type VehicleOption = { id: string; registrationNo: string; make: string; model: string }
type ScheduleOption = { id: string; vehicleId: string; label: string }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function MaintenanceForms({
  vehicles,
  schedules,
  canManageFleet,
  canRecordCosts,
}: {
  vehicles: VehicleOption[]
  schedules: ScheduleOption[]
  canManageFleet: boolean
  canRecordCosts: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState<'schedule' | 'job' | null>(null)
  const [jobVehicle, setJobVehicle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    action: (f: FormData) => Promise<{ ok: boolean; message?: string }>
  ) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = await action(new FormData(event.currentTarget))
    if (!result.ok) {
      setError(result.message ?? 'Something went wrong.')
      setPending(false)
      return
    }
    event.currentTarget.reset()
    setPending(false)
    setOpen(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {canManageFleet && (
          <Button variant={open === 'schedule' ? 'default' : 'outline'} size="sm" onClick={() => setOpen(open === 'schedule' ? null : 'schedule')}>
            <CalendarPlus className="size-4" /> Add schedule
          </Button>
        )}
        {canRecordCosts && (
          <Button variant={open === 'job' ? 'default' : 'outline'} size="sm" onClick={() => setOpen(open === 'job' ? null : 'job')}>
            <Wrench className="size-4" /> Record a job
          </Button>
        )}
      </div>

      {open === 'schedule' && (
        <form onSubmit={(e) => submit(e, createScheduleAction)} className="animate-enter grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Vehicle">
            <select name="vehicleId" className={selectClass} required defaultValue="">
              <option value="" disabled>Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNo} · {v.make} {v.model}</option>
              ))}
            </select>
          </Field>
          <Field label="Service">
            <select name="serviceType" className={selectClass} defaultValue="oil_change">
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Every (km)">
            <Input name="intervalKm" type="number" inputMode="numeric" placeholder="5000" />
          </Field>
          <Field label="Every (days)">
            <Input name="intervalDays" type="number" inputMode="numeric" placeholder="180" />
          </Field>
          <Field label="Warn before (km)">
            <Input name="alertBeforeKm" type="number" inputMode="numeric" defaultValue={500} />
          </Field>
          <Field label="Warn before (days)">
            <Input name="alertBeforeDays" type="number" inputMode="numeric" defaultValue={7} />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add schedule'}</Button>
            <span className="text-xs text-muted-foreground">
              Set kilometres, days, or both — the service comes due on whichever arrives first.
            </span>
          </div>
        </form>
      )}

      {open === 'job' && (
        <form onSubmit={(e) => submit(e, recordJobAction)} className="animate-enter grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Vehicle">
            <select
              name="vehicleId"
              className={selectClass}
              required
              value={jobVehicle}
              onChange={(e) => setJobVehicle(e.target.value)}
            >
              <option value="" disabled>Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNo} · {v.make} {v.model}</option>
              ))}
            </select>
          </Field>
          <Field label="Service done">
            <select name="serviceType" className={selectClass} defaultValue="oil_change">
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Satisfies schedule">
            <select name="scheduleId" className={selectClass} defaultValue="">
              <option value="">None — one-off job</option>
              {schedules
                .filter((s) => !jobVehicle || s.vehicleId === jobVehicle)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
            </select>
          </Field>
          <Field label="Date">
            <Input name="performedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Odometer (km)">
            <Input name="odometer" type="number" inputMode="numeric" placeholder="45200" />
          </Field>
          <Field label="Workshop">
            <Input name="workshopName" placeholder="Ali Motors" />
          </Field>
          <Field label="Labour (PKR)">
            <Input name="labourCost" inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Parts (PKR)">
            <Input name="partsCost" inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Other (PKR)">
            <Input name="otherCost" inputMode="decimal" placeholder="0" />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Record job'}</Button>
            <span className="text-xs text-muted-foreground">
              The cost posts to the ledger against this vehicle, and the schedule rolls forward.
            </span>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
