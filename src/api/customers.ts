import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { listCache } from './listCache'
import type { Schemas } from './schemas'

export type CustomerResponse = Schemas['CustomerResponse']
type CustomerListResponse = Schemas['CustomerListResponse']

const CUSTOMERS_KEY = ['customers'] as const
const customersList = listCache<CustomerResponse>(CUSTOMERS_KEY, 'customers')

export function useCustomersQuery() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: () => api.get<CustomerListResponse>('/customers'),
  })
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; admin_email: string }) =>
      api.post<CustomerResponse>('/customers', data),
    onSuccess: (created) => customersList.append(queryClient, created),
  })
}

export function useRenameCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<CustomerResponse>(`/customers/${id}`, { name }),
    onSuccess: (updated) => customersList.replace(queryClient, updated),
  })
}

export function useDeactivateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CustomerResponse>(`/customers/${id}/deactivate`),
    onSuccess: (updated) => customersList.replace(queryClient, updated),
  })
}

export function useReactivateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CustomerResponse>(`/customers/${id}/reactivate`),
    onSuccess: (updated) => customersList.replace(queryClient, updated),
  })
}
