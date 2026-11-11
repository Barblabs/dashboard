import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { api, type BackendFailure } from './client'
import type { Known, Override, Schemas } from './schemas'

// The CMDBs the dashboard knows how to talk to; only iTop has a connection flow today.
export type CmdbProvider = 'itop' | 'servicenow'

export type CmdbSyncFailure = Schemas['SyncFailureResponse']

/*
 * `last_sync` is when the latest successful Sync finished; `last_sync_failure` is set only
 * while the latest Sync failed, and carries no code, only the message.
 */
export type CmdbSource = Override<Schemas['CmdbSourceResponse'], { provider: CmdbProvider }>

export type CmdbLogin = Known<Schemas['LoginRequest']>

export type CmdbSourceRequest = Override<Known<Schemas['ConnectRequest']>, { provider: CmdbProvider }>

/*
 * Written by hand: the spec's TestResponse makes `code` and `error` optional whatever `ok`
 * says, while the backend sends both exactly when `ok` is false.
 */
export type CmdbTestResult =
  | { ok: true }
  /** `code` is a stable id used to translate the failure; it may be unknown to the frontend. */
  | ({ ok: false } & BackendFailure)

export type CmdbSyncResult = Schemas['SyncResponse']

/*
 * Data that only exists while a CMDB is connected lives under this root key, so
 * disconnecting clears all of it without knowing which features use it.
 */
export const connectionScopeKey = ['source'] as const

const sourceQuery = queryOptions({
  queryKey: ['cmdb', 'source'],
  queryFn: () => api.get<CmdbSource | null>('/cmdb/source'),
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
    onSuccess: ({ last_sync }) => {
      queryClient.setQueryData(
        sourceQuery.queryKey,
        (current) => current && { ...current, last_sync, last_sync_failure: null },
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
