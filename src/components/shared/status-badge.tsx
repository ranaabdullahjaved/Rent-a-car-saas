import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  tentative: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  unpaid: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  // Customer risk ratings. 'normal' stays neutral on purpose — most customers
  // are normal, and colouring them adds noise without adding information.
  normal: 'bg-muted text-muted-foreground',
  watch: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  blacklisted: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  // Vehicle statuses not already covered above.
  on_rent: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  damaged: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  sold: 'bg-muted text-muted-foreground',
  inactive: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? 'bg-muted text-muted-foreground'
  return (
    <Badge variant="outline" className={cn('capitalize border-transparent', tone)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}
