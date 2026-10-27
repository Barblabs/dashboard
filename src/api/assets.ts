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

export function assetKey(asset: Pick<Asset, 'source_id' | 'record_id'>) {
  return `${asset.source_id}/${asset.record_id}`
}
