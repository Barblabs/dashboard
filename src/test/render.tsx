import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { mockConnection, saveConnection } from '../mocks/store'

export function renderApp() {
  const user = userEvent.setup()
  render(<App />)
  return user
}

export function seedConnection(lastSync = new Date().toISOString()) {
  saveConnection({ ...mockConnection, lastSync })
}
