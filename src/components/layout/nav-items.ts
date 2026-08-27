export type NavItem = {
  label: string
  href: string
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Bookings', href: '/bookings' },
  { label: 'Fleet', href: '/fleet' },
  { label: 'Customers', href: '/customers' },
  { label: 'Finance', href: '/finance' },
  { label: 'Investors', href: '/investors' },
  { label: 'Maintenance', href: '/maintenance' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
]
