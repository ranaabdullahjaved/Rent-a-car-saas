import { describe, expect, it } from 'vitest'
import { ROLES, can, normaliseRole, type Capability } from './permissions'

describe('the split the brief asks for', () => {
  it('lets an agent book cars and take money at the desk', () => {
    expect(can('agent', 'bookings.manage')).toBe(true)
    expect(can('agent', 'customers.manage')).toBe(true)
    expect(can('agent', 'finance.record')).toBe(true)
  })

  it('never shows an agent the aggregates', () => {
    // "an agent to book cars without seeing my profit margins"
    expect(can('agent', 'reports.view')).toBe(false)
    expect(can('agent', 'investors.view')).toBe(false)
    expect(can('agent', 'expenses.record')).toBe(false)
    expect(can('agent', 'fleet.manage')).toBe(false)
  })
})

describe('the other roles', () => {
  it('gives the owner everything', () => {
    const everything: Capability[] = [
      'bookings.manage', 'customers.manage', 'fleet.manage', 'finance.record',
      'expenses.record', 'reports.view', 'investors.view', 'investors.manage',
      'team.manage', 'settings.manage',
    ]
    for (const c of everything) expect(can('owner', c), c).toBe(true)
  })

  it('keeps investor deals and the team owner-only', () => {
    for (const role of ['manager', 'accountant', 'agent']) {
      expect(can(role, 'investors.manage'), role).toBe(false)
      expect(can(role, 'team.manage'), role).toBe(false)
    }
  })

  it('lets an accountant work the money without touching operations', () => {
    expect(can('accountant', 'reports.view')).toBe(true)
    expect(can('accountant', 'expenses.record')).toBe(true)
    expect(can('accountant', 'bookings.manage')).toBe(false)
    expect(can('accountant', 'fleet.manage')).toBe(false)
  })
})

describe('normaliseRole', () => {
  it('maps the pre-model roles', () => {
    expect(normaliseRole('admin')).toBe('owner') // the seeded demo admin
    expect(normaliseRole('owner')).toBe('owner')
  })

  it('fails closed on anything unrecognised', () => {
    // 'staff' is the schema default from before roles existed. An unknown
    // role must land on the least privilege, never the most.
    expect(normaliseRole('staff')).toBe('agent')
    expect(normaliseRole('superuser')).toBe('agent')
    expect(normaliseRole('')).toBe('agent')
    expect(can('staff', 'reports.view')).toBe(false)
  })

  it('covers exactly the four roles', () => {
    expect([...ROLES]).toEqual(['owner', 'manager', 'accountant', 'agent'])
  })
})
