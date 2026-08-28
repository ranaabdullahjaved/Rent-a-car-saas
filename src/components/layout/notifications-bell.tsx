'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  ruleKey: string
  title: string | null
  body: string | null
  sentAt: string | null
  readAt: string | null
  sourceType: string
  sourceId: string
}

/** Where each alert should take you when clicked. */
function hrefFor(item: Item): string {
  if (item.sourceType === 'booking') return `/bookings/${item.sourceId}`
  if (item.sourceType === 'maintenance_schedule') return '/maintenance'
  if (item.sourceType === 'payment_promise') return '/finance'
  return '/'
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const body = await res.json()
      setItems(body.data.items)
      setUnread(body.data.unread)
    } catch {
      // Network blips are fine; the next poll catches up.
    }
  }, [])

  useEffect(() => {
    // A session with the app open keeps its own alerts fresh: sweep (server
    // throttles to one per 10 minutes per tenant), then load, then poll.
    void fetch('/api/notifications?action=sweep', { method: 'POST' }).then(refresh, refresh)
    const poll = setInterval(refresh, 60_000)
    return () => clearInterval(poll)
  }, [refresh])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0) // optimistic; opening acknowledges
      void fetch('/api/notifications?action=read', { method: 'POST' })
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-enter absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border bg-popover shadow-lg">
          <div className="border-b px-4 py-2.5 text-sm font-medium">Notifications</div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing yet. Booking reminders, returns, service and payment chases land here.
            </p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={hrefFor(n)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block px-4 py-3 transition-colors hover:bg-muted/60',
                      !n.readAt && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium">{n.title}</span>
                      {n.sentAt && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {n.sentAt.slice(5, 16).replace('T', ' ')}
                        </span>
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
