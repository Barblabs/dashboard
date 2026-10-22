/// <reference types="vitest/config" />
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// public/ is copied as is to dist; the MSW worker is only useful in development.
function excludeMockWorker(): Plugin {
  let outDir = ''
  return {
    name: 'exclude-mock-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      rmSync(resolve(outDir, 'mockServiceWorker.js'), { force: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), excludeMockWorker()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
    // With the mock off, the real network code reaches the MSW handlers.
    env: {
      VITE_API_URL: 'http://localhost:8080',
      VITE_USE_MOCK: 'false',
    },
  },
})
