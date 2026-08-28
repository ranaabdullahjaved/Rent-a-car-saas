'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addTeamMemberAction,
  setMemberActiveAction,
  setMemberRoleAction,
} from '@/lib/modules/team/team.actions'
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, normaliseRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export type Member = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  isSelf: boolean
}

export function TeamPanel({ members }: { members: Member[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    setPending(true)
    const result = await action()
    if (!result.ok) setError(result.message ?? 'Something went wrong.')
    setPending(false)
    router.refresh()
  }

  async function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setPending(true)
    const result = await addTeamMemberAction(form)
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    event.currentTarget.reset()
    setPending(false)
    setAdding(false)
    router.refresh()
  }

  return (
    <section className="animate-enter rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Team</h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" /> Add member
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        An agent takes bookings and payments but never sees margins, the ledger or investor payouts.
      </p>

      {adding && (
        <form onSubmit={onAdd} className="mb-5 grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input name="name" required placeholder="Bilal Ahmed" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Email</Label>
            <Input name="email" type="email" required placeholder="bilal@yourbusiness.pk" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <select name="role" className={selectClass} defaultValue="agent">
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Starting password</Label>
            <Input name="password" type="text" required minLength={8} placeholder="They change it later" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create account'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <span className="text-xs text-muted-foreground">
              Hand them the password in person — they sign in with it at this site.
            </span>
          </div>
        </form>
      )}

      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.id} className={cn('flex flex-wrap items-center gap-3 py-3', !m.isActive && 'opacity-55')}>
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {m.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {m.name}
                {m.isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                {!m.isActive && <span className="ml-2 text-xs text-destructive">deactivated</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            {m.isSelf ? (
              <span className="text-sm text-muted-foreground">{ROLE_LABELS[normaliseRole(m.role)]}</span>
            ) : (
              <>
                <select
                  className={selectClass}
                  value={normaliseRole(m.role)}
                  disabled={pending}
                  onChange={(e) => run(() => setMemberRoleAction(m.id, e.target.value))}
                  aria-label={`Role for ${m.name}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setMemberActiveAction(m.id, !m.isActive))}
                >
                  {m.isActive ? 'Deactivate' : 'Reactivate'}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
