import { http, HttpResponse } from 'msw'
import type { CustomerRole, UserResponse } from '../../../api/users'
import { loadUsers, saveUsers } from '../users-store'
import { apiUrl } from '../url'

function failure(status: number, code: string, error: string) {
  return HttpResponse.json({ code, error }, { status })
}

function isLastAdmin(users: UserResponse[], excludeId?: string): boolean {
  return (
    users.filter((u) => u.role === 'customer_admin' && u.disabled_at === null && u.id !== excludeId)
      .length === 0
  )
}

export const usersHandlers = [
  http.get(apiUrl('/users'), () => {
    return HttpResponse.json({ users: loadUsers() })
  }),

  http.post(apiUrl('/users'), async ({ request }) => {
    const { email, role } = (await request.json()) as { email: string; role: CustomerRole }
    const users = loadUsers()
    if (users.some((u) => u.email === email)) {
      return failure(409, 'email_taken', 'a user with this email already exists')
    }
    const user: UserResponse = {
      id: `user-${Date.now()}`,
      email,
      role,
      created_at: new Date().toISOString(),
      disabled_at: null,
    }
    saveUsers([...users, user])
    return HttpResponse.json(user, { status: 201 })
  }),

  http.patch(apiUrl('/users/:id'), async ({ params, request }) => {
    const id = params['id'] as string
    const { role } = (await request.json()) as { role: CustomerRole }
    const users = loadUsers()
    const user = users.find((u) => u.id === id)
    if (!user) return failure(404, 'user_not_found', 'user not found')
    if (role !== 'customer_admin' && isLastAdmin(users, id)) {
      return failure(409, 'last_customer_admin', 'a customer keeps at least one active customer admin')
    }
    const updated = { ...user, role }
    saveUsers(users.map((u) => (u.id === id ? updated : u)))
    return HttpResponse.json(updated)
  }),

  http.post(apiUrl('/users/:id/disable'), ({ params }) => {
    const id = params['id'] as string
    const users = loadUsers()
    const user = users.find((u) => u.id === id)
    if (!user) return failure(404, 'user_not_found', 'user not found')
    if (isLastAdmin(users, id)) {
      return failure(409, 'last_customer_admin', 'a customer keeps at least one active customer admin')
    }
    const updated = { ...user, disabled_at: new Date().toISOString() }
    saveUsers(users.map((u) => (u.id === id ? updated : u)))
    return HttpResponse.json(updated)
  }),
]
