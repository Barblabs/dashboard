import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { mockConnection, saveConnection } from '../mocks/store'

// jsdom keeps the URL between tests: every render opens the given path explicitly.
export function renderApp(path = '/') {
  window.history.replaceState(null, '', path)
  const user = userEvent.setup()
  render(<App />)
  return user
}

export function seedConnection(lastSync = new Date().toISOString()) {
  saveConnection({ ...mockConnection, lastSync })
}
