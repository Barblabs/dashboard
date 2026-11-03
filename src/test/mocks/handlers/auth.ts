import { http, HttpResponse } from 'msw'
import type { MeResponse } from '../../../api/generated'
import { apiUrl } from '../url'

type MockRole = 'platform_admin' | 'customer_admin' | 'viewer'

const MOCK_ROLE_KEY = 'barbattack_mock_role'

export function setMockRole(role: MockRole) {
  sessionStorage.setItem(MOCK_ROLE_KEY, role)
}

function getMockRole(): MockRole {
  return (sessionStorage.getItem(MOCK_ROLE_KEY) as MockRole | null) ?? 'customer_admin'
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
