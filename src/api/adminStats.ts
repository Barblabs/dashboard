import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Schemas } from './schemas'

export type CustomerStats = Schemas['CustomerStatsResponse']
export type SyncDay = Schemas['SyncDayResponse']
export type CustomerSlackDeliveries = Schemas['CustomerSlackDeliveriesResponse']

export interface CustomerStatsListResponse {
  customers: CustomerStats[]
}

export interface SyncHealthResponse {
  days: SyncDay[]
}

export interface SlackDeliveriesResponse {
  customers: CustomerSlackDeliveries[]
}

export function useCustomersStatsQuery() {
  return useQuery({
    queryKey: ['customers-stats'],
    queryFn: () => api.get<CustomerStatsListResponse>('/customers/stats'),
  })
}

export function useSyncHealthQuery() {
  return useQuery({
    queryKey: ['customers-sync-health'],
    queryFn: () => api.get<SyncHealthResponse>('/customers/sync-health?days=30'),
  })
}

export function useSlackDeliveriesQuery() {
  return useQuery({
    queryKey: ['customers-slack-deliveries'],
    queryFn: () => api.get<SlackDeliveriesResponse>('/customers/slack-deliveries?days=30'),
  })
}
