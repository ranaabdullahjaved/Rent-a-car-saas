import { NextResponse } from 'next/server'
import { AppError } from './errors'

/**
 * Every primary key in this schema is a bigserial mapped to a JS BigInt,
 * and JSON.stringify throws on BigInt. Serialising ids as strings is also
 * the correct wire format for 64-bit ids — a JSON number would silently
 * lose precision past 2^53 in any JavaScript client.
 */
function bigintSafe(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value
}

function json(body: unknown, status: number) {
  return new NextResponse(JSON.stringify(body, bigintSafe), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function jsonOk<T>(data: T, status = 200) {
  return json({ ok: true, data }, status)
}

export function jsonError(code: string, message: string, status: number) {
  return json({ ok: false, error: { code, message } }, status)
}

/**
 * Shared handler for Route Handlers. Anything it does not recognise is
 * re-thrown so it reaches the error boundary and Sentry, rather than
 * being flattened into a misleading 400.
 */
export function apiError(err: unknown) {
  // TenantError is an AppError carrying UNAUTHENTICATED/401, so it needs no
  // special case here.
  if (err instanceof AppError) {
    return jsonError(err.code, err.message, err.statusCode)
  }
  throw err
}
