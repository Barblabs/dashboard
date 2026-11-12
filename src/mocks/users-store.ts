import type { UserResponse } from '../api/users'
import { localStore } from './localStore'

export const MOCK_USERS: UserResponse[] = [
  {
    id: 'user-admin-1',
    email: 'admin@acme.example',
    role: 'customer_admin',
    created_at: '2026-01-01T00:00:00Z',
    disabled_at: null,
  },
  {
    id: 'user-viewer-1',
    email: 'viewer@acme.example',
    role: 'viewer',
    created_at: '2026-02-01T00:00:00Z',
    disabled_at: null,
  },
]

export const usersStore = localStore('barbattack_mock_users', MOCK_USERS)
