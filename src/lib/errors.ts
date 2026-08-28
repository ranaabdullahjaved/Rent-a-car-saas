export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 422)
  }
}

export class DoubleBookingError extends AppError {
  constructor() {
    super(
      'This vehicle is already booked for the selected dates.',
      'DOUBLE_BOOKING',
      409
    )
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED', 401)
  }
}

/**
 * Raised when a request has no valid session, or the signed-in user is not
 * usable — no tenant, deactivated, or deleted.
 *
 * Defined here rather than alongside requireTenant so that consumers which
 * only need the type (the API error mapper, its tests) don't pull the
 * database client into their module graph.
 */
export class TenantError extends AppError {
  constructor(message: string) {
    super(message, 'UNAUTHENTICATED', 401)
    this.name = 'TenantError'
  }
}

/**
 * Finds the Postgres SQLSTATE in an error chain.
 *
 * Drizzle wraps driver errors, so the real code sits on `cause` rather than
 * on the error itself — reading err.code alone silently misses every
 * constraint violation, including the double-booking one.
 */
export function pgErrorCode(err: unknown): string | undefined {
  let current: unknown = err
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = (current as { code?: unknown }).code
    // SQLSTATE is five characters, digits and uppercase letters (23P01).
    // Checking the shape avoids mistaking a library's own string code for one.
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

// Converts Postgres error codes to typed application errors
export function fromDbError(err: unknown): AppError {
  const code = pgErrorCode(err)
  if (code === '23P01') return new DoubleBookingError()
  if (code === '23505') return new AppError('Duplicate record', 'DUPLICATE', 409)
  throw err // re-throw unknown errors
}
