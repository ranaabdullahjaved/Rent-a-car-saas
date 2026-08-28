import { ShieldAlert } from 'lucide-react'

/**
 * Shown in place of a page the current role cannot see. Friendlier than a 403
 * and explicit about the way forward, since the person who can change the
 * role is usually in the same office.
 */
export function AccessDenied({ what }: { what: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="animate-enter max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-soft">
          <ShieldAlert className="size-6 text-warning" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">No access to {what}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role does not include this part of the business. If you need it, ask the owner to
          change your role in Settings.
        </p>
      </div>
    </div>
  )
}
