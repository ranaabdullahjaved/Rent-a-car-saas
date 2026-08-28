import { describe, expect, it } from 'vitest'
import { apiError, jsonError, jsonOk } from './api'
import { DoubleBookingError, NotFoundError, TenantError } from './errors'

describe('jsonOk', () => {
  // Every primary key is a bigserial mapped to BigInt, and JSON.stringify
  // throws on BigInt. Before this helper existed, every route that returned
  // a row crashed with "Do not know how to serialize a BigInt".
  it('serialises BigInt ids as strings instead of throwing', async () => {
    const res = jsonOk([{ id: 1n, tenantId: 1n, registrationNo: 'LEA-01-1234' }])
    await expect(res.json()).resolves.toEqual({
      ok: true,
      data: [{ id: '1', tenantId: '1', registrationNo: 'LEA-01-1234' }],
    })
  })

  it('survives an id beyond Number.MAX_SAFE_INTEGER without losing precision', async () => {
    const huge = 9007199254740993n // 2^53 + 1
    const res = jsonOk({ id: huge })
    const body = (await res.json()) as { data: { id: string } }
    expect(body.data.id).toBe('9007199254740993')
  })

  it('defaults to 200 and accepts an explicit status', () => {
    expect(jsonOk({}).status).toBe(200)
    expect(jsonOk({}, 201).status).toBe(201)
  })
})

describe('jsonError', () => {
  it('returns the documented failure envelope', async () => {
    const res = jsonError('NOT_FOUND', 'Vehicle not found', 404)
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Vehicle not found' },
    })
  })
})

describe('apiError', () => {
  it('maps a TenantError to 401', async () => {
    const res = apiError(new TenantError('No tenant associated with this account'))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  it('maps a double booking to 409', () => {
    expect(apiError(new DoubleBookingError()).status).toBe(409)
  })

  it('maps a not-found to 404', () => {
    expect(apiError(new NotFoundError('Vehicle')).status).toBe(404)
  })

  it('re-throws unknown errors rather than flattening them into a 400', () => {
    const boom = new Error('connection reset')
    expect(() => apiError(boom)).toThrow(boom)
  })
})
