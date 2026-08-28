/**
 * The four alerts the brief asks for, with their defaults. Pure module — the
 * engine reads these, the settings screen edits per-tenant overrides.
 */

export const RULE_KEYS = [
  'booking_reminder',
  'return_due',
  'maintenance_due',
  'payment_promise',
] as const

export type RuleKey = (typeof RULE_KEYS)[number]

export type RuleDefinition = {
  key: RuleKey
  label: string
  description: string
  /** Lead time before the event, in minutes. 0 means "on the day". */
  defaultOffsetMinutes: number
  offsetEditable: boolean
}

export const RULE_DEFINITIONS: Record<RuleKey, RuleDefinition> = {
  booking_reminder: {
    key: 'booking_reminder',
    label: 'Upcoming booking',
    description: 'So there is time to arrange the car',
    defaultOffsetMinutes: 48 * 60, // "2days before a booking is scheduled"
    offsetEditable: true,
  },
  return_due: {
    key: 'return_due',
    label: 'Return due',
    description: 'Call the customer before they are late',
    defaultOffsetMinutes: 5 * 60, // "5 hours before closing of the car"
    offsetEditable: true,
  },
  maintenance_due: {
    key: 'maintenance_due',
    label: 'Service due',
    description: 'A car is approaching or past its service interval',
    defaultOffsetMinutes: 0,
    offsetEditable: false, // the schedule's own alert margins drive this
  },
  payment_promise: {
    key: 'payment_promise',
    label: 'Payment promised',
    description: 'A customer said they would pay today',
    defaultOffsetMinutes: 0,
    offsetEditable: false,
  },
}

export type EffectiveRule = {
  key: RuleKey
  enabled: boolean
  offsetMinutes: number
  channels: string[]
}

/** Merges a tenant's stored overrides onto the defaults. */
export function effectiveRules(
  stored: { ruleKey: string; enabled: string; offsetMinutes: number; channels: unknown }[]
): EffectiveRule[] {
  return RULE_KEYS.map((key) => {
    const row = stored.find((r) => r.ruleKey === key)
    const def = RULE_DEFINITIONS[key]
    return {
      key,
      enabled: row ? row.enabled === 'true' : true,
      offsetMinutes: row && def.offsetEditable ? row.offsetMinutes : def.defaultOffsetMinutes,
      channels:
        row && Array.isArray(row.channels) && row.channels.length > 0
          ? (row.channels as string[])
          : ['in_app', 'email'],
    }
  })
}
