/// <reference types="vitest/config" />
import { unlinkSync, existsSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// mockServiceWorker.js is only needed in dev (VITE_USE_MOCK). Vite copies
// everything from public/ to dist/, so we delete it after every prod build.
const excludeMockWorker = {
  name: 'exclude-mock-service-worker',
  apply: 'build' as const,
  closeBundle() {
    const file = resolve(__dirname, 'dist/mockServiceWorker.js')
    if (existsSync(file)) unlinkSync(file)
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), excludeMockWorker],
  define: {
    global: 'globalThis',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Mock mode: tokens come from the mock role, so tests sign in and restore for real.
    env: {
      VITE_USE_MOCK: 'true',
      VITE_API_URL: 'http://localhost:8080',
      VITE_COGNITO_REGION: 'us-east-1',
      VITE_COGNITO_USER_POOL_ID: 'us-east-1_testpool',
      VITE_COGNITO_CLIENT_ID: 'test-client-id',
    },
  },
})
