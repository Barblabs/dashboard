import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { i18n } from '../i18n'
import { useAuthStore } from '../auth/store'
import { server } from './server'

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// With no saved choice, the detector falls back to jsdom's language (en-US): the suite runs in English.
afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  server.resetHandlers()
  server.events.removeAllListeners()
  localStorage.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  await i18n.changeLanguage()
})
afterAll(() => server.close())
