import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { i18n } from '../i18n'
import { server } from './server'

// Los handlers conservan los retrasos del mock (hasta 2 s en sync).
configure({ asyncUtilTimeout: 5000 })

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// Sin elección guardada, el detector vuelve al idioma de jsdom (en-US): la suite corre en inglés.
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  await i18n.changeLanguage()
})
afterAll(() => server.close())
