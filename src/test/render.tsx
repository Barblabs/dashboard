import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import type { AuthUser } from '../auth/store'
import { useAuthStore } from '../auth/store'
import type { CmdbSource } from '../api/cmdb'
import type { CustomerResponse } from '../api/customers'
import type { UserResponse } from '../api/users'
import { setMockRole } from '../auth/mockTokens'
import { mockSource, sourceStore } from '../mocks/cmdb-store'
import { customersStore } from '../mocks/customers-store'
import { usersStore } from '../mocks/users-store'
import {
  mockDeliveryOne,
  mockInstallationActive,
  slackDeliveriesStore,
  slackInstallationStore,
} from '../mocks/slack-store'
import type { SlackFailedDelivery, SlackInstallation } from '../api/slack'

const DEFAULT_TEST_USER: AuthUser = {
  id: 'test-user-id',
  email: 'admin@test.example',
  role: 'customer_admin',
  customer: { id: 'test-customer-id', name: 'Test Org' },
}

export const VIEWER: AuthUser = {
  id: 'viewer-id',
  email: 'viewer@test.example',
  role: 'viewer',
  customer: { id: 'test-customer-id', name: 'Test Org' },
}

export const PLATFORM_ADMIN: AuthUser = {
  id: 'platform-admin-id',
  email: 'superadmin@barbattack.example',
  role: 'platform_admin',
  customer: null,
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
  sourceStore.save({ ...mockSource, last_sync: new Date().toISOString(), ...overrides })
}

export function seedUsers(users: UserResponse[]) {
  usersStore.save(users)
}

export function seedSlackInstallation(installation: SlackInstallation | null = mockInstallationActive) {
  slackInstallationStore.save(installation)
}

export function seedSlackDeliveries(rows: SlackFailedDelivery[] = [mockDeliveryOne]) {
  slackDeliveriesStore.save(rows)
}

export function seedCustomers(customers: CustomerResponse[]) {
  customersStore.save(customers)
}
