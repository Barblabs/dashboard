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
    // Sin conexión legible se muestra la lista de CMDB de inmediato, como antes:
    // reintentar dejaría la página varios segundos en "Cargando".
    retry: false,
  })
}

export function useAssetsQuery() {
  // Solo lee la conexión de la caché: un observador más de useConnectionQuery
  // la volvería a pedir al montarse.
  const { data: connection } = useQuery({
    queryKey: connectionQueryKey,
    queryFn: getConnection,
    enabled: false,
  })
  return useQuery({
    queryKey: assetsQueryKey,
    queryFn: fetchAssets,
    enabled: Boolean(connection),
    // Igual que antes, un inventario ilegible pasa directo al estado vacío en vez de
    // quedarse varios segundos en "Cargando" mientras reintenta.
    retry: false,
    select: (response) => response.assets,
  })
}

// Las variables de una mutación incluyen la contraseña: gcTime 0 la saca de la caché
// en cuanto el formulario se desmonta, en vez de conservarla cinco minutos.
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
