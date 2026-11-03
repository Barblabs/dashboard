/**
 * Types derived from the barbackend OpenAPI spec.
 * Regenerate with: npm run gen:types  (requires backend running at VITE_API_URL)
 * The script overwrites this file with openapi-typescript output.
 */

// GET /me
export type Role = 'platform_admin' | 'customer_admin' | 'viewer'
export type CustomerRole = 'customer_admin' | 'viewer'

export interface MeCustomer {
  id: string
  name: string
}

export interface MeResponse {
  id: string
  email: string
  role: Role
  customer: MeCustomer | null
}

// GET /users, POST /users, PATCH /users/{id}, POST /users/{id}/disable
export interface UserResponse {
  id: string
  email: string
  role: CustomerRole
  created_at: string
  disabled_at: string | null
}

export interface UserListResponse {
  users: UserResponse[]
}

export interface InviteUserRequest {
  email: string
  role: CustomerRole
}

export interface ChangeRoleRequest {
  role: CustomerRole
}

// GET /customers, POST /customers, PATCH /customers/{id},
// POST /customers/{id}/deactivate, POST /customers/{id}/reactivate
export interface CustomerResponse {
  id: string
  name: string
  created_at: string
  deactivated_at: string | null
}

export interface CustomerListResponse {
  customers: CustomerResponse[]
}

export interface CreateCustomerRequest {
  name: string
  admin_email: string
}

export interface RenameCustomerRequest {
  name: string
}
