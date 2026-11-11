import { http, HttpResponse } from 'msw'
import type { components } from '../../../api/generated'
import { apiUrl } from '../url'

type MeResponse = components['schemas']['MeResponse']

type MockRole = 'platform_admin' | 'customer_admin' | 'viewer'

/*
 * The role picked on the mock sign-in page stands in for Cognito's tokens. It lives in
 * localStorage like they do, so reloads, new tabs and signing out elsewhere behave the same.
 */
export const MOCK_ROLE_KEY = 'barbattack_mock_role'

export function setMockRole(role: MockRole) {
  localStorage.setItem(MOCK_ROLE_KEY, role)
}

export function hasMockRole(): boolean {
  return localStorage.getItem(MOCK_ROLE_KEY) !== null
}

export function forgetMockRole() {
  localStorage.removeItem(MOCK_ROLE_KEY)
}

function getMockRole(): MockRole {
  return (localStorage.getItem(MOCK_ROLE_KEY) as MockRole | null) ?? 'customer_admin'
}

const MOCK_USERS: Record<MockRole, MeResponse> = {
  platform_admin: {
    id: 'mock-platform-admin',
    email: 'superadmin@barbattack.example',
    role: 'platform_admin',
    customer: null,
  },
  customer_admin: {
    id: 'mock-customer-admin',
    email: 'admin@barbattack.example',
    role: 'customer_admin',
    customer: { id: 'mock-customer-id', name: 'ACME Corp' },
  },
  viewer: {
    id: 'mock-viewer',
    email: 'viewer@barbattack.example',
    role: 'viewer',
    customer: { id: 'mock-customer-id', name: 'ACME Corp' },
  },
}

export const authHandlers = [
  http.get(apiUrl('/me'), () => HttpResponse.json(MOCK_USERS[getMockRole()])),
]
