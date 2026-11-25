import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityFilter } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import { findingsStatsScopeKey } from './findingsSummary'
import { listCache } from './listCache'
import type { Schemas } from './schemas'

export type Area = Schemas['AreaResponse']
export type AreaListResponse = Schemas['AreaListResponse']
export type AreaHealth = Schemas['AreaHealthResponse']

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

export function useAreaHealthQuery() {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'area-health'],
    queryFn: async () => (await api.get<Schemas['AreaHealthListResponse']>('/areas/health')).areas,
  })
}
