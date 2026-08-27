import { Temporal } from '@js-temporal/polyfill'

// Installs Temporal onto globalThis so it can be used like the native
// (still-stage-3) API everywhere, without importing it in every file.
// Import this module once, early (e.g. from the root layout / worker entrypoint).
if (typeof globalThis.Temporal === 'undefined') {
  globalThis.Temporal = Temporal
}

// Tenants default to this timezone (see tenants.timezone in the schema).
export const DEFAULT_TIMEZONE = 'Asia/Karachi'

export { Temporal }
