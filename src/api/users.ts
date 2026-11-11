import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { components } from './generated'

type _UserSchema = components['schemas']['UserResponse']
export type CustomerRole = _UserSchema['role']

export interface UserResponse {
  id: string
  email: string
  role: CustomerRole
  created_at: string
  disabled_at: string | null
}

interface UserListResponse {
  users: UserResponse[]
}

const USERS_KEY = ['users'] as const

export function useUsersQuery() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: () => api.get<UserListResponse>('/users'),
  })
}

export function useInviteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; role: CustomerRole }) =>
      api.post<UserResponse>('/users', data),
    onSuccess: (user) => {
      queryClient.setQueryData<UserListResponse>(USERS_KEY, (prev) =>
        prev ? { users: [...prev.users, user] } : { users: [user] },
      )
    },
  })
}

export function useChangeRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: CustomerRole }) =>
      api.patch<UserResponse>(`/users/${id}`, { role }),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserListResponse>(USERS_KEY, (prev) =>
        prev ? { users: prev.users.map((u) => (u.id === updated.id ? updated : u)) } : prev,
      )
    },
  })
}

export function useDisableUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<UserResponse>(`/users/${id}/disable`),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserListResponse>(USERS_KEY, (prev) =>
        prev ? { users: prev.users.map((u) => (u.id === updated.id ? updated : u)) } : prev,
      )
    },
  })
}
