import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { appendTo, replaceById } from './listCache'
import type { Schemas } from './schemas'

export type UserResponse = Schemas['UserResponse']
type UserListResponse = Schemas['UserListResponse']
export type CustomerRole = UserResponse['role']

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
    onSuccess: (invited) => appendTo(queryClient, USERS_KEY, 'users', invited),
  })
}

export function useChangeRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: CustomerRole }) =>
      api.patch<UserResponse>(`/users/${id}`, { role }),
    onSuccess: (updated) => replaceById(queryClient, USERS_KEY, 'users', updated),
  })
}

export function useDisableUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<UserResponse>(`/users/${id}/disable`),
    onSuccess: (updated) => replaceById(queryClient, USERS_KEY, 'users', updated),
  })
}
