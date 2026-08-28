import { describe, expect, it } from 'vitest'
import {
  createVehicleSchema,
  fleetFilterSchema,
  normaliseRegistrationSearch,
} from './fleet.validation'

const base = { registrationNo: 'LEA-01-1234', make: 'Toyota', model: 'Corolla' }

describe('registration numbers', () => {
  it('canonicalises the ways people actually type a plate', () => {
    for (const input of ['lea 01 1234', 'LEA-01-1234', 'Lea  01--1234']) {
      expect(createVehicleSchema.parse({ ...base, registrationNo: input }).registrationNo).toBe(
        'LEA-01-1234'
      )
    }
  })

  it('strips separators for search so any spacing matches', () => {
    expect(normaliseRegistrationSearch('lea 01-1234')).toBe('LEA011234')
    expect(normaliseRegistrationSearch('LEA011234')).toBe('LEA011234')
  })
})

describe('ownership', () => {
  it('requires an investor when the vehicle is investor-owned', () => {
    const parsed = createVehicleSchema.safeParse({ ...base, ownershipType: 'investor' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['investorId'])
    }
  })

  it('accepts an investor-owned vehicle with an investor', () => {
    const parsed = createVehicleSchema.parse({
      ...base,
      ownershipType: 'investor',
      investorId: '7',
    })
    expect(parsed.investorId).toBe(7n)
  })

  it('does not require an investor for a company car', () => {
    expect(createVehicleSchema.safeParse({ ...base, ownershipType: 'company' }).success).toBe(true)
  })
})

describe('optional fields from a form', () => {
  it('turns empty strings into null rather than storing blanks', () => {
    const parsed = createVehicleSchema.parse({
      ...base,
      variant: '',
      colour: '',
      modelYear: '',
      engineCc: '',
      notes: '',
    })
    expect(parsed.variant).toBeNull()
    expect(parsed.colour).toBeNull()
    expect(parsed.modelYear).toBeNull()
    expect(parsed.engineCc).toBeNull()
    expect(parsed.notes).toBeNull()
  })

  it('defaults the odometer to zero when left blank', () => {
    expect(createVehicleSchema.parse({ ...base, currentOdometer: '' }).currentOdometer).toBe(0)
  })

  it('coerces numeric strings from form data', () => {
    const parsed = createVehicleSchema.parse({ ...base, modelYear: '2022', currentOdometer: '45000' })
    expect(parsed.modelYear).toBe(2022)
    expect(parsed.currentOdometer).toBe(45000)
  })

  it('rejects an implausible model year', () => {
    expect(createVehicleSchema.safeParse({ ...base, modelYear: '1776' }).success).toBe(false)
  })
})

describe('fleetFilterSchema', () => {
  it('applies defaults when nothing is in the URL', () => {
    const parsed = fleetFilterSchema.parse({})
    expect(parsed.sort).toBe('createdAt')
    expect(parsed.dir).toBe('desc')
  })

  it('rejects a sort column that is not allow-listed', () => {
    // Guards against a crafted ?sort= reaching the query builder.
    expect(fleetFilterSchema.safeParse({ sort: 'tenantId' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(fleetFilterSchema.safeParse({ status: 'exploded' }).success).toBe(false)
  })
})
