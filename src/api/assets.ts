import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { connectionScopeKey } from './cmdb'

export const ASSET_KINDS = ['server', 'virtual_machine', 'workstation', 'network_device'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const CRITICALITIES = ['high', 'medium', 'low'] as const
export type Criticality = (typeof CRITICALITIES)[number]

export const ACTIVITY_FILTERS = ['true', 'false', 'all'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export type SoftwareRole = 'operating_system' | 'application'

export type Exposure = 'internet_facing' | 'internal'

export interface Product {
  vendor: string
  name: string
}

export interface SoftwareComponent {
  role: SoftwareRole
  name: string
  version: string
  /** `null` for an Unidentified Component: threats cannot be checked against it. */
  product: Product | null
}

export interface Hardware {
  vendor: string
  model: string
}

export interface AssetOwner {
  email: string
  source: 'declared' | 'imported'
}

export interface Asset {
  source_id: string
  record_id: string
  name: string
  description: string
  kind: AssetKind
  hardware: Hardware | null
  /** Already in display order. */
  software: SoftwareComponent[]
  criticality: Criticality | null
  exposure: Exposure | null
  owner: AssetOwner | null
  /** What the CMDB reports; independent of whether the Asset is still monitored. */
  retired: boolean
  active: boolean
  inactive_since: string | null
}

export interface AssetsPage {
  assets: Asset[]
  next_cursor: string | null
  /** Assets matching the filters, ignoring paging. */
  total: number
}

export interface AssetFilters {
  active: ActivityFilter
  kind: AssetKind | null
  criticality: Criticality | null
}

export const DEFAULT_ASSET_FILTERS: AssetFilters = { active: 'true', kind: null, criticality: null }

export const ASSETS_PAGE_SIZE = 50

// The backend rejects a cursor sent with other filters, so every page request repeats them.
function assetsPath(filters: AssetFilters, cursor: string | null) {
  const params = new URLSearchParams({ limit: String(ASSETS_PAGE_SIZE), active: filters.active })
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.criticality) params.set('criticality', filters.criticality)
  if (cursor) params.set('cursor', cursor)
  return `/assets?${params}`
}

export function assetKey(asset: Pick<Asset, 'source_id' | 'record_id'>) {
  return `${asset.source_id}/${asset.record_id}`
}

// The inventory comes from the connected CMDB, so it is dropped on disconnect.
function assetsQuery(filters: AssetFilters, cursor: string | null) {
  return queryOptions({
    queryKey: [...connectionScopeKey, 'assets', filters, cursor],
    queryFn: () => api.get<AssetsPage>(assetsPath(filters, cursor)),
    // An unreadable inventory shows its error right away instead of staying on
    // "Loading" for several seconds while it retries.
    retry: false,
    // Keeps the current page on screen while the next one loads, instead of flashing "Loading".
    placeholderData: keepPreviousData,
  })
}

// Only mounted under an active connection: the page renders the inventory in the connected state.
export function useAssetsQuery(filters: AssetFilters, cursor: string | null) {
  return useQuery(assetsQuery(filters, cursor))
}
