/**
 * Service prediction from real usage — "it will be calculated how much it
 * travel and when the next maintainance is due", straight from the brief.
 *
 * Pure functions, no database import, so the arithmetic is testable alone.
 */

export type ScheduleLike = {
  intervalKm: number | null
  intervalDays: number | null
  lastServiceKm: number | null
  lastServiceAt: string | null // date column
  alertBeforeKm: number
  alertBeforeDays: number
}

export type Prediction = {
  dueKm: number | null
  dueDate: string | null
  kmRemaining: number | null
  daysRemaining: number | null
  /** Days until due by distance at the observed pace, when both are known. */
  projectedDaysByKm: number | null
  status: 'ok' | 'due_soon' | 'overdue' | 'unknown'
}

const DAY_MS = 86_400_000

/**
 * Average daily kilometres from two odometer readings taken days apart.
 * Returns null rather than guessing when the data cannot support an answer.
 */
export function averageDailyKm(
  earliest: { odometer: number; at: Date } | null,
  latest: { odometer: number; at: Date } | null
): number | null {
  if (!earliest || !latest) return null
  const days = (latest.at.getTime() - earliest.at.getTime()) / DAY_MS
  const km = latest.odometer - earliest.odometer
  if (days < 1 || km < 0) return null
  return Math.round((km / days) * 10) / 10
}

/**
 * Where a schedule stands, given the vehicle's current odometer and pace.
 *
 * A schedule can be due by distance, by time, or whichever comes first when
 * both intervals are set. It is OVERDUE the moment either threshold is
 * passed, and DUE SOON inside the alert margin — the same margin the alert
 * engine fires on, so the screen and the notification always agree.
 */
export function predictService(
  schedule: ScheduleLike,
  currentOdometer: number,
  avgKmPerDay: number | null,
  today = new Date()
): Prediction {
  const todayIso = today.toISOString().slice(0, 10)

  const dueKm =
    schedule.intervalKm !== null && schedule.lastServiceKm !== null
      ? schedule.lastServiceKm + schedule.intervalKm
      : null

  const dueDate =
    schedule.intervalDays !== null && schedule.lastServiceAt !== null
      ? new Date(new Date(schedule.lastServiceAt + 'T00:00:00Z').getTime() + schedule.intervalDays * DAY_MS)
          .toISOString()
          .slice(0, 10)
      : null

  if (dueKm === null && dueDate === null) {
    return { dueKm, dueDate, kmRemaining: null, daysRemaining: null, projectedDaysByKm: null, status: 'unknown' }
  }

  const kmRemaining = dueKm !== null ? dueKm - currentOdometer : null
  const daysRemaining =
    dueDate !== null
      ? Math.floor((new Date(dueDate + 'T00:00:00Z').getTime() - new Date(todayIso + 'T00:00:00Z').getTime()) / DAY_MS)
      : null

  const projectedDaysByKm =
    kmRemaining !== null && avgKmPerDay !== null && avgKmPerDay > 0
      ? Math.floor(Math.max(0, kmRemaining) / avgKmPerDay)
      : null

  const overdue = (kmRemaining !== null && kmRemaining <= 0) || (daysRemaining !== null && daysRemaining <= 0)
  if (overdue) {
    return { dueKm, dueDate, kmRemaining, daysRemaining, projectedDaysByKm, status: 'overdue' }
  }

  const soonByKm = kmRemaining !== null && kmRemaining <= schedule.alertBeforeKm
  const soonByDate = daysRemaining !== null && daysRemaining <= schedule.alertBeforeDays
  // Pace matters: plenty of kilometres left still becomes "soon" if the car
  // is covering them quickly.
  const soonByPace = projectedDaysByKm !== null && projectedDaysByKm <= schedule.alertBeforeDays

  return {
    dueKm,
    dueDate,
    kmRemaining,
    daysRemaining,
    projectedDaysByKm,
    status: soonByKm || soonByDate || soonByPace ? 'due_soon' : 'ok',
  }
}
