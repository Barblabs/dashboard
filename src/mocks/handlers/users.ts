import { http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import type { Known, Schemas } from '../../api/schemas'
import { CUSTOMER_ROLES, type UserResponse } from '../../api/users'
import { usersStore } from '../users-store'
import { apiUrl } from '../url'
import { failure, parsedBody } from './responses'

export const inviteBody = z.object({ email: z.string(), role: z.enum(CUSTOMER_ROLES) }) satisfies ZodType<
  Known<Schemas['InviteUserRequest']>
>
const changeRoleBody = z.object({ role: z.enum(CUSTOMER_ROLES) }) satisfies ZodType<Known<Schemas['ChangeRoleRequest']>>

function isLastAdmin(users: UserResponse[], excludeId?: string): boolean {
  return (
    users.filter((u) => u.role === 'customer_admin' && u.disabled_at === null && u.id !== excludeId)
      .length === 0
  )
}

export const usersHandlers = [
  http.get(apiUrl('/users'), () => {
    return HttpResponse.json({ users: usersStore.load() })
  }),

  http.post(apiUrl('/users'), async ({ request }) => {
    const body = await parsedBody(request, inviteBody)
    if (body instanceof Response) return body
    const { email, role } = body
    const users = usersStore.load()
    if (users.some((u) => u.email === email)) {
      return failure(409, 'email_taken', 'a user with this email already exists')
    }
    const user: UserResponse = {
      id: `user-${Date.now()}`,
      email,
      role,
      created_at: new Date().toISOString(),
      disabled_at: null,
      pending: false,
    }
    usersStore.save([...users, user])
    return HttpResponse.json(user, { status: 201 })
  }),

  http.patch<{ id: string }>(apiUrl('/users/:id'), async ({ params, request }) => {
    const body = await parsedBody(request, changeRoleBody)
    if (body instanceof Response) return body
    const { role } = body
    const { id } = params
    const users = usersStore.load()
    const user = users.find((u) => u.id === id)
    if (!user) return failure(404, 'user_not_found', 'user not found')
    if (role !== 'customer_admin' && isLastAdmin(users, id)) {
      return failure(409, 'last_customer_admin', 'a customer keeps at least one active customer admin')
    }
    const updated = { ...user, role }
    usersStore.save(users.map((u) => (u.id === id ? updated : u)))
    return HttpResponse.json(updated)
  }),

  http.post<{ id: string }>(apiUrl('/users/:id/disable'), ({ params }) => {
    const { id } = params
    const users = usersStore.load()
    const user = users.find((u) => u.id === id)
    if (!user) return failure(404, 'user_not_found', 'user not found')
    if (isLastAdmin(users, id)) {
      return failure(409, 'last_customer_admin', 'a customer keeps at least one active customer admin')
    }
    const updated = { ...user, disabled_at: new Date().toISOString() }
    usersStore.save(users.map((u) => (u.id === id ? updated : u)))
    return HttpResponse.json(updated)
  }),
]
