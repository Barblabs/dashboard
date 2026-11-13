import type { Override, Schemas } from './schemas'

export const ASSET_KINDS = ['server', 'virtual_machine', 'workstation', 'network_device'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const CRITICALITIES = ['high', 'medium', 'low'] as const
export type Criticality = (typeof CRITICALITIES)[number]

export const ACTIVITY_FILTERS = ['true', 'false', 'all'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export type SoftwareRole = 'operating_system' | 'application'

export const EXPOSURES = ['internet_facing', 'internal'] as const
export type Exposure = (typeof EXPOSURES)[number]

/**
 * `value` is the effective Exposure: the Declaration when there is one, otherwise `imported`.
 * Either is `null` when Unknown.
 */
export type AssetExposure = Override<
  Schemas['ExposureResponse'],
  { value: Exposure | null; imported: Exposure | null }
>

export type Product = Schemas['ProductResponse']

/** `product` is `null` for an Unidentified Component: threats cannot be checked against it. */
export type SoftwareComponent = Override<Schemas['SoftwareResponse'], { role: SoftwareRole }>

export type Hardware = Schemas['HardwareResponse']

export type AssetOwner = Override<Schemas['OwnerResponse'], { source: 'declared' | 'imported' }>

export type AreaRef = Schemas['AreaRefResponse']

/*
 * The spec types the vocabularies as plain strings. `retired` is what the CMDB reports,
 * independent of whether the Asset is still monitored (`active`). A retired Asset has no
 * `lifecycle_stage`; otherwise `null` means the CMDB Source doesn't give it.
 */
export type Asset = Override<
  Schemas['AssetResponse'],
  {
    kind: AssetKind
    criticality: Criticality | null
    exposure: AssetExposure
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

/** Software Components not matched to a Product: threats can't be checked against them. */
export function unidentifiedCount(asset: Pick<Asset, 'software'>) {
  return asset.software.filter((component) => component.product === null).length
}
