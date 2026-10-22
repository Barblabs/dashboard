import { queryOptions, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { connectionScopeKey } from './cmdb'

export type AssetKind =
  | 'Server'
  | 'Virtual Machine'
  | 'Workstation'
  | 'Network Device'

export type Criticality = 'High' | 'Medium' | 'Low' | 'Unknown'

export type SoftwareRole = 'Operating System' | 'Application'

export interface Product {
  vendor: string
  name: string
}

export interface SoftwareComponent {
  role: SoftwareRole
  name: string
  version: string
  product: Product | null
}

export interface Hardware {
  vendor: string
  model: string
}

export interface Asset {
  record_id: string
  name: string
  description: string
  kind: AssetKind
  hardware: Hardware | null
  software: SoftwareComponent[]
  criticality: Criticality
  owner: string | null
  active: boolean
}

export interface AssetsResponse {
  assets: Asset[]
}

// The inventory comes from the connected CMDB, so it is dropped on disconnect.
const assetsQuery = queryOptions({
  queryKey: [...connectionScopeKey, 'assets'],
  queryFn: () => api.get<AssetsResponse>('/assets'),
  // As before, an unreadable inventory goes straight to the empty state instead of
  // staying on "Loading" for several seconds while it retries.
  retry: false,
  select: (response) => response.assets,
})

// Only mounted under an active connection: the page renders the inventory in the connected state.
export function useAssetsQuery() {
  return useQuery(assetsQuery)
}
