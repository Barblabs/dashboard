import type { UserResponse } from '../../api/users'

const STORAGE_KEY = 'barbattack_mock_users'

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

export function loadUsers(): UserResponse[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as UserResponse[]) : MOCK_USERS
}

export function saveUsers(users: UserResponse[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}
