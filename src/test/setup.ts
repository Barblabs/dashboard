import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { i18n } from '../i18n'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// With no saved choice, the detector falls back to jsdom's language (en-US): the suite runs in English.
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  await i18n.changeLanguage()
})
afterAll(() => server.close())
