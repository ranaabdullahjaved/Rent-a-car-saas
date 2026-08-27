import type { Temporal as TemporalPolyfill } from '@js-temporal/polyfill'

declare global {
  // Installed onto globalThis by src/lib/temporal.ts
  var Temporal: typeof TemporalPolyfill
}

export {}
