import type { Override, Schemas } from './schemas'

export const ASSET_KINDS = ['server', 'virtual_machine', 'workstation', 'network_device'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const CRITICALITIES = ['high', 'medium', 'low'] as const
export type Criticality = (typeof CRITICALITIES)[number]

export const ACTIVITY_FILTERS = ['true', 'false', 'all'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export type SoftwareRole = 'operating_system' | 'application'

export type Exposure = 'internet_facing' | 'internal'

export type Product = Schemas['ProductResponse']

/** `product` is `null` for an Unidentified Component: threats cannot be checked against it. */
export type SoftwareComponent = Override<Schemas['SoftwareResponse'], { role: SoftwareRole }>

export type Hardware = Schemas['HardwareResponse']

export type AssetOwner = Override<Schemas['OwnerResponse'], { source: 'declared' | 'imported' }>

export type AreaRef = Schemas['AreaRefResponse']

/*
 * The spec types the vocabularies as plain strings. `retired` is what the CMDB reports,
 * independent of whether the Asset is still monitored (`active`).
 */
export type Asset = Override<
  Schemas['AssetResponse'],
  {
    kind: AssetKind
    criticality: Criticality | null
    exposure: Exposure | null
    owner: AssetOwner | null
    /** Already in display order. */
    software: SoftwareComponent[]
  }
>

export type AssetsPage = Override<Schemas['AssetListResponse'], { assets: Asset[] }>

export interface AssetFilters {
  active: ActivityFilter
  kind: AssetKind | null
  criticality: Criticality | null
}

export function assetKey(asset: Pick<Asset, 'source_id' | 'record_id'>) {
  return `${asset.source_id}/${asset.record_id}`
}
