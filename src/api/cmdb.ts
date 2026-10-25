import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { api, type BackendFailure } from './client'

// The CMDBs the dashboard knows how to talk to; only iTop has a connection flow today.
export type CmdbProvider = 'itop' | 'servicenow'

export interface CmdbSyncFailure {
  at: string
  error: string
}

export interface CmdbSource {
  provider: CmdbProvider
  url: string
  /** `null` for token-auth sources, which only the backend CLI can create. */
  user: string | null
  /** When the latest successful Sync finished. */
  lastSync: string | null
  /** Set only while the latest Sync failed; it carries no code, only the message. */
  lastSyncFailure: CmdbSyncFailure | null
}

export interface CmdbLogin {
  url: string
  user: string
  password: string
}

export interface CmdbSourceRequest extends CmdbLogin {
  provider: CmdbProvider
}

export type CmdbTestResult =
  | { ok: true }
  /** `code` is a stable id used to translate the failure; it may be unknown to the frontend. */
  | ({ ok: false } & BackendFailure)

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

const sourceQuery = queryOptions({
  queryKey: ['cmdb', 'source'],
  queryFn: () => api.get<CmdbSource | null>('/cmdb/source'),
  retry: false,
})

export function useSourceQuery() {
  return useQuery(sourceQuery)
}

function refetchSource(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: sourceQuery.queryKey })
}

function refreshInventory(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: connectionScopeKey })
}

// Mutation variables include the password: gcTime 0 evicts it from the cache as soon
// as the form unmounts, instead of keeping it for five minutes.
export function useTestLoginMutation(provider: CmdbProvider) {
  return useMutation({
    mutationFn: (login: CmdbLogin) =>
      api.post<CmdbTestResult>('/cmdb/source/test', { provider, ...login } satisfies CmdbSourceRequest),
    gcTime: 0,
  })
}

function useSaveSourceMutation(save: (login: CmdbLogin) => Promise<CmdbSource>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: save,
    gcTime: 0,
    onSuccess: (source) => {
      queryClient.setQueryData(sourceQuery.queryKey, source)
    },
  })
}

export function useConnectMutation(provider: CmdbProvider) {
  return useSaveSourceMutation((login) =>
    api.post<CmdbSource>('/cmdb/source', { provider, ...login } satisfies CmdbSourceRequest),
  )
}

export function useUpdateLoginMutation() {
  return useSaveSourceMutation((login) => api.put<CmdbSource>('/cmdb/source', login))
}

export function useSyncMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<CmdbSyncResult>('/cmdb/source/sync'),
    onSuccess: ({ lastSync }) => {
      queryClient.setQueryData(
        sourceQuery.queryKey,
        (current) => current && { ...current, lastSync, lastSyncFailure: null },
      )
      refreshInventory(queryClient)
    },
    onError: () => refetchSource(queryClient),
  })
}

export function useDisconnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/cmdb/source'),
    onSuccess: () => {
      queryClient.setQueryData(sourceQuery.queryKey, null)
      queryClient.removeQueries({ queryKey: connectionScopeKey })
    },
    onError: () => refetchSource(queryClient),
  })
}
