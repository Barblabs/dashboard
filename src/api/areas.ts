import { useQuery } from '@tanstack/react-query'
import type { ActivityFilter } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import type { components } from './generated'

export type Area = components['schemas']['AreaResponse']
export type AreaListResponse = components['schemas']['AreaListResponse']

// Areas are imported by the connected CMDB, so a sync refetches them and a disconnect drops them.
export const areasKey = (active: ActivityFilter) => [...connectionScopeKey, 'areas', active] as const

export function useAreasQuery(active: ActivityFilter) {
  return useQuery({
    queryKey: areasKey(active),
    queryFn: () => api.get<AreaListResponse>(`/areas?active=${active}`),
    retry: false,
  })
}
