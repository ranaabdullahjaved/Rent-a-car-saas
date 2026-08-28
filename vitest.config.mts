import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Repository tests open real connections; keep them off the default run
    // until a disposable test database is wired up (RAC-7).
    exclude: ['**/node_modules/**', '**/.next/**', 'src/**/*.db.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
