import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityFilter } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import { listCache } from './listCache'
import type { Schemas } from './schemas'

export type Area = Schemas['AreaResponse']
export type AreaListResponse = Schemas['AreaListResponse']

// Areas are imported by the connected CMDB, so a sync refetches them and a disconnect drops them.
const areasKey = [...connectionScopeKey, 'areas'] as const
const areasList = listCache<Area>(areasKey, 'areas')

export function useAreasQuery(active: ActivityFilter) {
  return useQuery({
    queryKey: [...areasKey, active],
    queryFn: () => api.get<AreaListResponse>(`/areas?active=${active}`),
  })
}

export function useSetAreaOwnerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, email }: { id: number; email: string | null }) =>
      api.put<Area>(`/areas/${id}/owner`, { email }),
    onSuccess: (updated) => areasList.replace(queryClient, updated),
  })
}
