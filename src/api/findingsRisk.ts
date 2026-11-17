import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Schemas } from './schemas'
import type { Override } from './schemas'

export type BreakdownBy = 'exposure' | 'criticality' | 'area'

export type BreakdownGroup = Override<
  Schemas['GroupResponse'],
  {
    critical: number
    high: number
    medium: number
    low: number
    unbanded: number
  }
>

export interface BreakdownResponse {
  by: string
  groups: BreakdownGroup[]
}

export type AssetFindingBands = Schemas['AssetFindingBandsResponse']

export interface AssetFindingsSummaryResponse {
  assets: AssetFindingBands[]
}

export type ComponentCount = Schemas['ComponentCountResponse']
export type CveCount = Schemas['CveCountResponse']

export interface TopResponse {
  components: ComponentCount[]
  cves: CveCount[]
}

export function useBreakdownQuery(by: BreakdownBy) {
  return useQuery({
    queryKey: ['findings-breakdown', by],
    queryFn: () => api.get<BreakdownResponse>(`/findings/breakdown?by=${by}`),
  })
}

export function useAssetFindingsSummaryQuery() {
  return useQuery({
    queryKey: ['assets-findings-summary'],
    queryFn: () => api.get<AssetFindingsSummaryResponse>('/assets/findings-summary'),
  })
}

export function useFindingsTopQuery() {
  return useQuery({
    queryKey: ['findings-top'],
    queryFn: () => api.get<TopResponse>('/findings/top?limit=10'),
  })
}
