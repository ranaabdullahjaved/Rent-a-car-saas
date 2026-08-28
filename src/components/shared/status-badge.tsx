import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Every status in the app maps to one of five tones, so colour always means
 * the same thing: green is fine, amber needs attention, red is a problem,
 * blue is in motion, grey is inert.
 */
const STATUS_TONES: Record<string, Tone> = {
  // good
  active: 'success',
  confirmed: 'success',
  available: 'success',
  paid: 'success',
  repaired: 'success',
  completed: 'success',
  // attention
  tentative: 'warning',
  pending: 'warning',
  unpaid: 'warning',
  partial: 'warning',
  watch: 'warning',
  repairing: 'warning',
  maintenance: 'warning',
  contested: 'warning',
  // problem
  cancelled: 'danger',
  overdue: 'danger',
  blacklisted: 'danger',
  damaged: 'danger',
  written_off: 'danger',
  // in motion
  on_rent: 'info',
  dispatched: 'info',
  open: 'info',
  // inert
  normal: 'neutral',
  sold: 'neutral',
  inactive: 'neutral',
  waived: 'neutral',
  draft: 'neutral',
}

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-destructive',
  info: 'bg-info-soft text-info',
  neutral: 'bg-muted text-muted-foreground',
}

const TONE_DOTS: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground/50',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        TONE_CLASSES[tone]
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', TONE_DOTS[tone])} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}
