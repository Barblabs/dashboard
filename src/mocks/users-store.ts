import { z, type ZodType } from 'zod'
import { CUSTOMER_ROLES, type UserResponse } from '../api/users'
import { localStore } from './localStore'

export const MOCK_USERS: UserResponse[] = [
  {
    id: 'user-admin-1',
    email: 'admin@acme.example',
    role: 'customer_admin',
    created_at: '2026-01-01T00:00:00Z',
    disabled_at: null,
    pending: false,
  },
  {
    id: 'user-viewer-1',
    email: 'viewer@acme.example',
    role: 'viewer',
    created_at: '2026-02-01T00:00:00Z',
    disabled_at: null,
    pending: false,
  },
  {
    id: 'user-pending-1',
    email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
    role: 'viewer',
    created_at: '2026-03-01T00:00:00Z',
    disabled_at: null,
    pending: true,
  },
]

const userSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  role: z.enum(CUSTOMER_ROLES),
  created_at: z.string(),
  disabled_at: z.string().nullable(),
  pending: z.boolean(),
}) satisfies ZodType<UserResponse>

export const usersStore = localStore('barbattack_mock_users', z.array(userSchema), MOCK_USERS)
