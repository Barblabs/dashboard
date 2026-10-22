import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { connect, getConnection, testConnection } from './cmdb'
import type { CmdbConnection } from './types'

export const connectionQueryKey = ['cmdb', 'connection'] as const

export function useConnectionQuery() {
  return useQuery({
    queryKey: connectionQueryKey,
    queryFn: getConnection,
    // Sin conexión legible se muestra la lista de CMDB de inmediato, como antes:
    // reintentar dejaría la página varios segundos en "Cargando".
    retry: false,
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
