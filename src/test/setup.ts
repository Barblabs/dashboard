import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { i18n } from '../i18n'
import { useAuthStore } from '../auth/store'
import { server } from './server'

// jsdom lays nothing out, so it has no scrollIntoView; the Inspector calls it on every selection.
Element.prototype.scrollIntoView = () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// With no saved choice, the detector falls back to jsdom's language (en-US): the suite runs in English.
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  await i18n.changeLanguage()
})
afterAll(() => server.close())
