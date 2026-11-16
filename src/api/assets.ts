import type { Override, Schemas } from './schemas'

export const ASSET_KINDS = ['server', 'virtual_machine', 'workstation', 'network_device'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

const CRITICALITIES = ['high', 'medium', 'low'] as const
export type Criticality = (typeof CRITICALITIES)[number]

/** `unknown` matches an Asset whose `criticality` is `null`. */
export const CRITICALITY_FILTERS = [...CRITICALITIES, 'unknown'] as const
type CriticalityFilter = (typeof CRITICALITY_FILTERS)[number]

export const ACTIVITY_FILTERS = ['true', 'false', 'all'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export type SoftwareRole = 'operating_system' | 'application'

export const EXPOSURES = ['internet_facing', 'internal'] as const
export type Exposure = (typeof EXPOSURES)[number]

/** Matched on the effective Exposure: `unknown` matches an Asset whose `exposure.value` is `null`. */
export const EXPOSURE_FILTERS = [...EXPOSURES, 'unknown'] as const
type ExposureFilter = (typeof EXPOSURE_FILTERS)[number]

/**
 * `value` is the effective Exposure: the Declaration when there is one, otherwise `imported`.
 * Either is `null` when Unknown.
 */
export type AssetExposure = Override<
  Schemas['ExposureResponse'],
  { value: Exposure | null; imported: Exposure | null }
>

export type InformationClassification = NonNullable<Schemas['InformationClassificationResponse']['value']>
export const INFORMATION_CLASSIFICATIONS = [
  'public',
  'private',
  'confidential',
] as const satisfies readonly InformationClassification[]

/** `unclassified` matches an Asset without a Declaration. */
export const INFORMATION_CLASSIFICATION_FILTERS = [...INFORMATION_CLASSIFICATIONS, 'unclassified'] as const
type InformationClassificationFilter = (typeof INFORMATION_CLASSIFICATION_FILTERS)[number]

/** Only ever declared, so it is all set or, when Unclassified, all `null` (ADR 0031). */
export type AssetInformationClassification =
  | Override<Schemas['InformationClassificationResponse'], { value: null; declared_by: null; declared_at: null }>
  | Override<
      Schemas['InformationClassificationResponse'],
      { value: InformationClassification; declared_by: string; declared_at: string }
    >

/** `product` is `null` for an Unidentified Component: threats cannot be checked against it. */
type SoftwareComponent = Override<Schemas['SoftwareResponse'], { role: SoftwareRole }>

type AssetOwner = Override<Schemas['OwnerResponse'], { source: 'declared' | 'imported' }>

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
    information_classification: AssetInformationClassification
    owner: AssetOwner | null
    /** Already in display order. */
    software: SoftwareComponent[]
  }
>

export type AssetsPage = Override<Schemas['AssetListResponse'], { assets: Asset[] }>

/** An empty list leaves the Assets unfiltered by that field; several values match any of them. */
export interface AssetFilters {
  active: ActivityFilter
  kind: AssetKind[]
  criticality: CriticalityFilter[]
  exposure: ExposureFilter[]
  information_classification: InformationClassificationFilter[]
  /** Area ids, as in `GET /areas`. */
  area: number[]
}

export function assetKey(asset: Pick<Asset, 'source_id' | 'record_id'>) {
  return `${asset.source_id}/${asset.record_id}`
}

/** Software Components not matched to a Product: threats can't be checked against them. */
export function unidentifiedCount(asset: Pick<Asset, 'software'>) {
  return asset.software.filter((component) => component.product === null).length
}
