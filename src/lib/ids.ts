import { z } from 'zod'

/**
 * Zod schemas for the bigserial ids used throughout the schema.
 *
 * These exist because `BigInt('not-a-number')` throws a SyntaxError, and a
 * throw inside a Zod transform escapes safeParse entirely — so a malformed id
 * in a request body surfaced as a 500 with a stack trace instead of a 422
 * naming the bad field. The shape is checked before the conversion, so the
 * conversion can never throw.
 */

const ID_PATTERN = /^\d+$/

function looksLikeId(value: unknown): boolean {
  if (typeof value === 'bigint') return value >= 0n
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0
  if (typeof value === 'string') return ID_PATTERN.test(value.trim())
  return false
}

function toBigInt(value: string | number | bigint): bigint {
  return BigInt(typeof value === 'string' ? value.trim() : value)
}

function isBlank(value: unknown): boolean {
  return value === '' || value === undefined || value === null
}

/** An id that must be present. */
export const requiredId = z
  .union([z.string(), z.number(), z.bigint()])
  .refine(looksLikeId, 'That is not a valid id')
  .transform(toBigInt)

/**
 * An id that may be absent. Accepts an omitted field, an empty string from a
 * form, or an explicit JSON null — all of which mean "none".
 */
export const optionalId = z
  .union([z.string(), z.number(), z.bigint()])
  .nullish()
  .refine((v) => isBlank(v) || looksLikeId(v), 'That is not a valid id')
  .transform((v) => (isBlank(v) ? null : toBigInt(v as string | number | bigint)))

export { looksLikeId }
