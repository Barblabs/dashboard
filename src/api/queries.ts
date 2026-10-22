import { useQuery } from '@tanstack/react-query'
import { getConnection } from './cmdb'

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
