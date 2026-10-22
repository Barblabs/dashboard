import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { i18n } from '../i18n'
import { server } from './server'

// The handlers keep the mock delays (up to 2 s on sync).
configure({ asyncUtilTimeout: 5000 })

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// With no saved choice, the detector falls back to jsdom's language (en-US): the suite runs in English.
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  await i18n.changeLanguage()
})
afterAll(() => server.close())
