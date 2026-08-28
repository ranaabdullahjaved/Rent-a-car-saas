'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateRuleAction } from '@/lib/modules/alerts/alert.actions'
import { RULE_DEFINITIONS, type RuleKey } from '@/lib/modules/alerts/alert.rules'
import { cn } from '@/lib/utils'

export type RuleRow = {
  key: RuleKey
  enabled: boolean
  offsetMinutes: number
}

export function AlertsPanel({ rules }: { rules: RuleRow[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  async function save(key: RuleKey, enabled: boolean, offsetMinutes: number) {
    setError(null)
    setPending(key)
    const result = await updateRuleAction(key, enabled, offsetMinutes)
    if (!result.ok) setError(result.message)
    setPending(null)
    router.refresh()
  }

  return (
    <section className="animate-enter rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">Alerts</h2>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">
        Delivered to the bell in the app and by email to the owner. WhatsApp joins them once the
        WhatsApp credentials are configured.
      </p>

      <ul className="divide-y">
        {rules.map((r) => {
          const def = RULE_DEFINITIONS[r.key]
          const hours = Math.round(r.offsetMinutes / 60)
          return (
            <li key={r.key} className="flex flex-wrap items-center gap-3 py-3">
              <button
                type="button"
                role="switch"
                aria-checked={r.enabled}
                aria-label={`${def.label} ${r.enabled ? 'on' : 'off'}`}
                disabled={pending === r.key}
                onClick={() => save(r.key, !r.enabled, r.offsetMinutes)}
                className={cn(
                  'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                  r.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                    r.enabled ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{def.label}</div>
                <div className="text-xs text-muted-foreground">{def.description}</div>
              </div>
              {def.offsetEditable && (
                <form
                  className="flex items-center gap-1.5 text-sm"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const v = Number(new FormData(e.currentTarget).get('hours'))
                    if (Number.isFinite(v) && v >= 1 && v <= 168) save(r.key, r.enabled, v * 60)
                  }}
                >
                  <Input
                    name="hours"
                    type="number"
                    min={1}
                    max={168}
                    defaultValue={hours}
                    className="h-8 w-16 text-center"
                    aria-label={`${def.label} lead time in hours`}
                  />
                  <span className="text-xs text-muted-foreground">h before</span>
                  <Button type="submit" size="sm" variant="outline" disabled={pending === r.key}>
                    Set
                  </Button>
                </form>
              )}
            </li>
          )
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
