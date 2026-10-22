import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface CmdbConnection {
  provider: 'itop'
  url: string
  user: string
  lastSync: string | null
}

export interface CmdbCredentials {
  url: string
  user: string
  password: string
}

export type CmdbTestResult =
  | { ok: true }
  /** `code` is a stable id used to translate the failure; it may be missing or unknown to the frontend. */
  | { ok: false; code?: string; error?: string }

export interface CmdbSyncResult {
  lastSync: string
  created: number
  updated: number
  deactivated: number
  reactivated: number
  skipped: number
}

/*
 * Data that only exists while a CMDB is connected lives under this root key, so
 * disconnecting clears all of it without knowing which features use it.
 */
export const connectionScopeKey = ['source'] as const

const connectionQuery = queryOptions({
  queryKey: ['cmdb', 'connection'],
  queryFn: () => api.get<CmdbConnection | null>('/cmdb/connection'),
  // An unreadable connection shows the CMDB list right away, as before:
  // retrying would leave the page on "Loading" for several seconds.
  retry: false,
})

export function useConnectionQuery() {
  return useQuery(connectionQuery)
}

// Mutation variables include the password: gcTime 0 evicts it from the cache as soon
// as the form unmounts, instead of keeping it for five minutes.
export function useTestConnectionMutation() {
  return useMutation({
    mutationFn: (credentials: CmdbCredentials) =>
      api.post<CmdbTestResult>('/cmdb/test', credentials),
    gcTime: 0,
  })
}

export function useConnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credentials: CmdbCredentials) =>
      api.post<CmdbConnection>('/cmdb/connect', credentials),
    gcTime: 0,
    onSuccess: (connection) => {
      queryClient.setQueryData(connectionQuery.queryKey, connection)
    },
  })
}

export function useSyncMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<CmdbSyncResult>('/cmdb/sync', {}),
    onSuccess: ({ lastSync }) => {
      queryClient.setQueryData(
        connectionQuery.queryKey,
        (current) => current && { ...current, lastSync },
      )
    },
  })
}

export function useDisconnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/cmdb/connection'),
    onSuccess: () => {
      queryClient.setQueryData(connectionQuery.queryKey, null)
      queryClient.removeQueries({ queryKey: connectionScopeKey })
    },
  })
}
