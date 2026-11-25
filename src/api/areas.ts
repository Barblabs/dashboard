import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityFilter } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import { findingsStatsScopeKey } from './findingsSummary'
import { listCache } from './listCache'
import type { Override, Schemas } from './schemas'

export type Area = Schemas['AreaResponse']
export type AreaListResponse = Schemas['AreaListResponse']
type AreaHealthResponse = Schemas['AreaHealthResponse']

/** `aging_critical` comes from an open Critical, so only an aging Area has an oldest one for sure. It is listed first. */
type AgingArea = Override<
  AreaHealthResponse,
  { needs_help: true; reasons: ['aging_critical'] | ['aging_critical', 'growing']; oldest_critical_days: number }
>

export type AreaHealth =
  | AgingArea
  | Override<AreaHealthResponse, { needs_help: true; reasons: ['growing'] }>
  | Override<AreaHealthResponse, { needs_help: false; reasons: [] }>

type AreaHealthList = Override<Schemas['AreaHealthListResponse'], { areas: AreaHealth[] }>

export function isAging(area: AreaHealth): area is AgingArea {
  return area.reasons[0] === 'aging_critical'
}

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
    queryFn: async () => (await api.get<AreaHealthList>('/areas/health')).areas,
  })
}
