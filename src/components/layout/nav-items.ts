import {
  Banknote,
  Calendar,
  Car,
  Gauge,
  Landmark,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: Gauge },
  { label: 'Bookings', href: '/bookings', icon: Calendar },
  { label: 'Fleet', href: '/fleet', icon: Car },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Finance', href: '/finance', icon: Banknote },
  { label: 'Investors', href: '/investors', icon: Landmark },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench },
  { label: 'Settings', href: '/settings', icon: Settings },
]
