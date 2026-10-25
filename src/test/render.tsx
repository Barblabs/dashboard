import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import type { CmdbSource } from '../api/cmdb'
import { mockSource, saveSource } from '../mocks/store'

// jsdom keeps the URL between tests: every render opens the given path explicitly.
export function renderApp(path = '/') {
  window.history.replaceState(null, '', path)
  const user = userEvent.setup()
  render(<App />)
  return user
}

export function seedSource(lastSync = new Date().toISOString(), overrides: Partial<CmdbSource> = {}) {
  saveSource({ ...mockSource, lastSync, ...overrides })
}
