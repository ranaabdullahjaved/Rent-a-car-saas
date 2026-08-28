'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CarFront } from 'lucide-react'
import { navItems } from './nav-items'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <CarFront className="size-5" strokeWidth={2.2} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">
          RentFlow
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
            >
              {/* Active rail */}
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary transition-all duration-200',
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                )}
              />
              <Icon
                className={cn(
                  'size-[18px] transition-colors',
                  active ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80'
                )}
                strokeWidth={2}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-sidebar-foreground/40">
        Rent-a-car operations
      </div>
    </aside>
  )
}
