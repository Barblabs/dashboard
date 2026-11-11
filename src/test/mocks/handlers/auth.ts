import { http, HttpResponse } from 'msw'
import type { components } from '../../../api/generated'
import { storedMockRole } from '../../../auth/mockTokens'
import type { Role } from '../../../auth/store'
import { apiUrl } from '../url'

type MeResponse = components['schemas']['MeResponse']

const MOCK_USERS: Record<Role, MeResponse> = {
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
  http.get(apiUrl('/me'), () => HttpResponse.json(MOCK_USERS[storedMockRole() ?? 'customer_admin'])),
]
