import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import type { AuthUser } from '../auth/store'
import { useAuthStore } from '../auth/store'
import type { CmdbSource } from '../api/cmdb'
import type { UserResponse } from '../api/users'
import { mockSource, saveSource } from './mocks/store'
import { saveUsers } from './mocks/users-store'

const DEFAULT_TEST_USER: AuthUser = {
  id: 'test-user-id',
  email: 'admin@test.example',
  role: 'customer_admin',
  customer: { id: 'test-customer-id', name: 'Test Org' },
}

// jsdom keeps the URL between tests: every render opens the given path explicitly.
// Seeds the auth store with a customer_admin by default so protected routes render.
export function renderApp(path = '/', user: AuthUser | null = DEFAULT_TEST_USER) {
  if (user !== null) useAuthStore.getState().setSession(user, 'test-token')
  window.history.replaceState(null, '', path)
  const testUser = userEvent.setup()
  render(<App />)
  return testUser
}

export function seedSource(overrides: Partial<CmdbSource> = {}) {
  saveSource({ ...mockSource, last_sync: new Date().toISOString(), ...overrides })
}

export function seedUsers(users: UserResponse[]) {
  saveUsers(users)
}
