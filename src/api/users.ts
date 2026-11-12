import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { listCache } from './listCache'
import type { Schemas } from './schemas'

export type UserResponse = Schemas['UserResponse']
type UserListResponse = Schemas['UserListResponse']
export type CustomerRole = UserResponse['role']

const USERS_KEY = ['users'] as const
const usersList = listCache<UserResponse>(USERS_KEY, 'users')

export function useUsersQuery() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: () => api.get<UserListResponse>('/users'),
  })
}

/*
 * `onInvited` runs from the mutation itself, not from `mutate`: it still runs when the
 * component that started the invitation unmounted before the answer came back.
 */
export function useInviteUserMutation({ onInvited }: { onInvited: (invited: UserResponse) => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; role: CustomerRole }) =>
      api.post<UserResponse>('/users', data),
    onSuccess: (invited) => {
      usersList.append(queryClient, invited)
      onInvited(invited)
    },
  })
}

export function useChangeRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: CustomerRole }) =>
      api.patch<UserResponse>(`/users/${id}`, { role }),
    onSuccess: (updated) => usersList.replace(queryClient, updated),
  })
}

export function useDisableUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<UserResponse>(`/users/${id}/disable`),
    onSuccess: (updated) => usersList.replace(queryClient, updated),
  })
}
