import { describe, expect, it } from 'vitest'
import { looksLikeId, optionalId, requiredId } from './ids'

describe('requiredId', () => {
  it('accepts the forms ids actually arrive in', () => {
    expect(requiredId.parse('42')).toBe(42n)
    expect(requiredId.parse(42)).toBe(42n)
    expect(requiredId.parse(42n)).toBe(42n)
    expect(requiredId.parse(' 42 ')).toBe(42n)
  })

  it('returns a validation failure instead of throwing on garbage', () => {
    // BigInt() throws a SyntaxError, and a throw inside a transform escapes
    // safeParse — which turned a bad id into a 500 rather than a 422.
    const r = requiredId.safeParse('32 inbound 18000')
    expect(r.success).toBe(false)
  })

  it('rejects the other ways an id can be malformed', () => {
    for (const bad of ['', 'abc', '1.5', '-1', 'null', 'undefined', '12abc', ' ']) {
      expect(requiredId.safeParse(bad).success, `${JSON.stringify(bad)} should be rejected`).toBe(
        false
      )
    }
  })

  it('rejects a non-integer or negative number', () => {
    expect(requiredId.safeParse(1.5).success).toBe(false)
    expect(requiredId.safeParse(-1).success).toBe(false)
  })

  it('handles an id beyond Number.MAX_SAFE_INTEGER without losing precision', () => {
    expect(requiredId.parse('9007199254740993')).toBe(9007199254740993n)
  })
})

describe('optionalId', () => {
  it('treats every way of saying "none" as null', () => {
    expect(optionalId.parse(undefined)).toBeNull()
    expect(optionalId.parse(null)).toBeNull() // JSON callers send this
    expect(optionalId.parse('')).toBeNull() // an untouched form field sends this
  })

  it('converts a real id', () => {
    expect(optionalId.parse('7')).toBe(7n)
  })

  it('still rejects garbage rather than silently treating it as none', () => {
    const r = optionalId.safeParse('not-an-id')
    expect(r.success).toBe(false)
  })
})

describe('looksLikeId', () => {
  it('agrees with the schemas', () => {
    expect(looksLikeId('1')).toBe(true)
    expect(looksLikeId(1n)).toBe(true)
    expect(looksLikeId('one')).toBe(false)
    expect(looksLikeId({})).toBe(false)
    expect(looksLikeId(true)).toBe(false)
  })
})
