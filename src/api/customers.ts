import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CustomerResponse } from './generated'

export type { CustomerResponse }

interface CustomerListResponse {
  customers: CustomerResponse[]
}

const CUSTOMERS_KEY = ['customers'] as const

export function useCustomersQuery() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: () => api.get<CustomerListResponse>('/customers'),
    retry: false,
  })
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; admin_email: string }) =>
      api.post<CustomerResponse>('/customers', data),
    onSuccess: (created) => {
      queryClient.setQueryData<CustomerListResponse>(CUSTOMERS_KEY, (prev) =>
        prev ? { customers: [...prev.customers, created] } : { customers: [created] },
      )
    },
  })
}

export function useRenameCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<CustomerResponse>(`/customers/${id}`, { name }),
    onSuccess: (updated) => {
      queryClient.setQueryData<CustomerListResponse>(CUSTOMERS_KEY, (prev) =>
        prev
          ? { customers: prev.customers.map((c) => (c.id === updated.id ? updated : c)) }
          : prev,
      )
    },
  })
}

export function useDeactivateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CustomerResponse>(`/customers/${id}/deactivate`),
    onSuccess: (updated) => {
      queryClient.setQueryData<CustomerListResponse>(CUSTOMERS_KEY, (prev) =>
        prev
          ? { customers: prev.customers.map((c) => (c.id === updated.id ? updated : c)) }
          : prev,
      )
    },
  })
}

export function useReactivateCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CustomerResponse>(`/customers/${id}/reactivate`),
    onSuccess: (updated) => {
      queryClient.setQueryData<CustomerListResponse>(CUSTOMERS_KEY, (prev) =>
        prev
          ? { customers: prev.customers.map((c) => (c.id === updated.id ? updated : c)) }
          : prev,
      )
    },
  })
}
