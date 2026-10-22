import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAssets } from './assets'
import { connect, disconnect, getConnection, syncNow, testConnection } from './cmdb'
import type { CmdbConnection } from './types'

export const connectionQueryKey = ['cmdb', 'connection'] as const
export const assetsQueryKey = ['assets'] as const

export function useConnectionQuery() {
  return useQuery({
    queryKey: connectionQueryKey,
    queryFn: getConnection,
    // An unreadable connection shows the CMDB list right away, as before:
    // retrying would leave the page on "Loading" for several seconds.
    retry: false,
  })
}

// Only mounted under an active connection: the page renders the inventory in the connected state.
export function useAssetsQuery() {
  return useQuery({
    queryKey: assetsQueryKey,
    queryFn: fetchAssets,
    // As before, an unreadable inventory goes straight to the empty state instead of
    // staying on "Loading" for several seconds while it retries.
    retry: false,
    select: (response) => response.assets,
  })
}

// Mutation variables include the password: gcTime 0 evicts it from the cache as soon
// as the form unmounts, instead of keeping it for five minutes.
export function useTestConnectionMutation() {
  return useMutation({ mutationFn: testConnection, gcTime: 0 })
}

export function useConnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: connect,
    gcTime: 0,
    onSuccess: (connection) => {
      queryClient.setQueryData<CmdbConnection | null>(connectionQueryKey, connection)
    },
  })
}

export function useSyncMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: syncNow,
    onSuccess: ({ lastSync }) => {
      queryClient.setQueryData<CmdbConnection | null>(
        connectionQueryKey,
        (current) => current && { ...current, lastSync },
      )
    },
  })
}

export function useDisconnectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: disconnect,
    onSuccess: () => {
      queryClient.setQueryData<CmdbConnection | null>(connectionQueryKey, null)
      queryClient.removeQueries({ queryKey: assetsQueryKey })
    },
  })
}
