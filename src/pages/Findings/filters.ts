import { currentScoreDetails, type Finding } from '../../api/prioritizations'

export interface FindingsFilters {
  band: string
  exposure: string
  criticality: string
  assetName: string
  area: string
  status: string
  kev: boolean
  text: string
  fromChart: boolean
  ids: Set<string>
}

export function parseFilters(params: URLSearchParams): FindingsFilters {
  const idsParam = params.get('ids')
  return {
    band: params.get('band') ?? '',
    exposure: params.get('exposure') ?? '',
    criticality: params.get('criticality') ?? '',
    assetName: params.get('asset') ?? '',
    area: params.get('area') ?? '',
    status: params.get('status') ?? '',
    kev: params.get('kev') === '1',
    text: params.get('q') ?? '',
    fromChart: params.get('from') === 'chart',
    ids: idsParam ? new Set(idsParam.split(',')) : new Set(),
  }
}

export function hasActiveFilters({ band, exposure, criticality, assetName, status, kev, text, ids }: FindingsFilters): boolean {
  return !!(band || exposure || criticality || assetName || status || kev || text || ids.size > 0)
}

export function matchesFinding(f: Finding, filters: FindingsFilters): boolean {
  const { band, exposure, criticality, assetName, status, kev, text, ids } = filters
  if (ids.size > 0 && !ids.has(f.finding_id)) return false
  if (assetName && f.asset_name !== assetName) return false
  if (text) {
    const q = text.toLowerCase()
    if (
      !f.cve_id.toLowerCase().includes(q) &&
      !f.component.toLowerCase().includes(q) &&
      !f.asset_name.toLowerCase().includes(q)
    )
      return false
  }
  if (band && currentScoreDetails(f).band !== band) return false
  if (exposure) {
    const eff = f.current?.asset.exposure ?? f.details.asset.exposure
    if (eff !== exposure) return false
  }
  if (criticality) {
    const c = f.current?.asset.criticality ?? f.details.asset.criticality
    if (c !== criticality) return false
  }
  if (status === 'open' && f.closed_at !== null) return false
  if (status === 'closed' && f.closed_at === null) return false
  if (kev && !f.details.kev) return false
  return true
}
