'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CarFront, LogOut, Menu, X } from 'lucide-react'
import { navItems } from './nav-items'
import { NotificationsBell } from './notifications-bell'
import { ThemeToggle } from './theme-toggle'
import { signOut } from '@/lib/auth/client'
import { cn } from '@/lib/utils'

type TopbarProps = {
  tenantName: string
  userName: string
  userEmail: string
}

export function Topbar({ tenantName, userName, userEmail }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const initials = userName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function onSignOut() {
    setSigningOut(true)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/85 px-4 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile menu button */}
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground md:hidden">
            <CarFront className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">{tenantName}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <NotificationsBell />
          <ThemeToggle />
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {initials || '·'}
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-medium">{userName}</div>
              <div className="text-[11px] text-muted-foreground">{userEmail}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            className="ml-1 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-soft hover:text-destructive"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 animate-enter flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex h-16 items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CarFront className="size-5" strokeWidth={2.2} />
                </span>
                <span className="text-[15px] font-semibold text-sidebar-accent-foreground">RentFlow</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 px-3">
              {navItems.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px]',
                      active
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/75'
                    )}
                  >
                    <Icon className={cn('size-5', active && 'text-sidebar-primary')} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
