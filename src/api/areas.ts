import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityFilter } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import type { components } from './generated'
import { replaceById } from './listCache'

export type Area = components['schemas']['AreaResponse']
export type AreaListResponse = components['schemas']['AreaListResponse']

// Areas are imported by the connected CMDB, so a sync refetches them and a disconnect drops them.
const areasKey = [...connectionScopeKey, 'areas'] as const

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
    // Every cached filter variant may list the area, so each one gets the updated row.
    onSuccess: (updated) => replaceById(queryClient, areasKey, 'areas', updated),
  })
}
