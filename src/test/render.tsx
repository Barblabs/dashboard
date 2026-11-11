import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import type { AuthUser } from '../auth/store'
import { useAuthStore } from '../auth/store'
import type { CmdbSource } from '../api/cmdb'
import type { CustomerResponse } from '../api/customers'
import type { UserResponse } from '../api/users'
import { setMockRole } from './mocks/handlers/auth'
import { mockSource, saveSource } from './mocks/store'
import { saveCustomers } from './mocks/customers-store'
import { saveUsers } from './mocks/users-store'

const DEFAULT_TEST_USER: AuthUser = {
  id: 'test-user-id',
  email: 'admin@test.example',
  role: 'customer_admin',
  customer: { id: 'test-customer-id', name: 'Test Org' },
}

/*
 * jsdom keeps the URL between tests: every render opens the given path explicitly.
 * Starts signed in as a customer_admin by default so protected routes render at once;
 * with `null` nothing is stored and the app starts as a fresh visit would.
 */
export function renderApp(path = '/', user: AuthUser | null = DEFAULT_TEST_USER) {
  if (user !== null) {
    setMockRole(user.role)
    useAuthStore.getState().establishSession(user)
  }
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

export function seedCustomers(customers: CustomerResponse[]) {
  saveCustomers(customers)
}
