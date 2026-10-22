/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
    // Con el mock apagado, el código de red real llega a los handlers de MSW.
    env: {
      VITE_API_URL: 'http://localhost:8080',
      VITE_USE_MOCK: 'false',
    },
  },
})
