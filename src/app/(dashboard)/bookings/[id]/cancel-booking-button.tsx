'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cancelBookingAction } from '@/lib/modules/booking/booking.actions'

/**
 * Cancels a booking that has not yet been checked out. The server refuses
 * anything past checkout, so this is only rendered for tentative/confirmed
 * bookings with no actual start.
 */
export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>
    )
  }

  async function confirm() {
    if (!reason.trim()) {
      setError('Give a reason for cancelling.')
      return
    }
    setError(null)
    setPending(true)
    const result = await cancelBookingAction(bookingId, reason)
    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancelling"
          className="w-56"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void confirm()
          }}
        />
        <Button variant="destructive" onClick={confirm} disabled={pending}>
          {pending ? 'Cancelling…' : 'Confirm'}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Keep it
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
