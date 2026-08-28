/**
 * The permission model, in one place and free of any database import.
 *
 * The split that matters comes straight from the brief: an agent books cars
 * and takes money at the desk, but must not see the business's aggregates —
 * margins, the ledger, investor payouts, salaries. So recording a payment
 * against a booking is a different capability from viewing financial reports.
 */

export const ROLES = ['owner', 'manager', 'accountant', 'agent'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accountant: 'Accountant',
  agent: 'Agent',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Everything, including team, settings and investor deals',
  manager: 'Runs the fleet day to day — vehicles, bookings, money and reports',
  accountant: 'Money and reports, but cannot change the fleet or take bookings',
  agent: 'Takes bookings and payments at the desk. Never sees margins or payouts',
}

export type Capability =
  | 'bookings.manage' // create, cancel, hand over, record incidents
  | 'customers.manage'
  | 'fleet.manage' // add and edit vehicles, vendors
  | 'finance.record' // take a payment or add a charge on a booking
  | 'expenses.record' // record business expenses and salaries
  | 'reports.view' // ledger, finance page, per-vehicle profit, dashboards
  | 'investors.view'
  | 'investors.manage' // agreements and payouts
  | 'team.manage'
  | 'settings.manage'

const GRANTS: Record<Role, ReadonlySet<Capability>> = {
  owner: new Set([
    'bookings.manage', 'customers.manage', 'fleet.manage', 'finance.record',
    'expenses.record', 'reports.view', 'investors.view', 'investors.manage',
    'team.manage', 'settings.manage',
  ]),
  manager: new Set([
    'bookings.manage', 'customers.manage', 'fleet.manage', 'finance.record',
    'expenses.record', 'reports.view', 'investors.view', 'settings.manage',
  ]),
  accountant: new Set([
    'finance.record', 'expenses.record', 'reports.view', 'investors.view',
  ]),
  agent: new Set(['bookings.manage', 'customers.manage', 'finance.record']),
}

/**
 * Older rows carry roles from before this model existed. 'admin' predates
 * 'owner'; anything unrecognised gets the least privileged role rather than
 * failing open.
 */
export function normaliseRole(role: string): Role {
  if ((ROLES as readonly string[]).includes(role)) return role as Role
  if (role === 'admin') return 'owner'
  return 'agent'
}

export function can(role: string, capability: Capability): boolean {
  return GRANTS[normaliseRole(role)].has(capability)
}
