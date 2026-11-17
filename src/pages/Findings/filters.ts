import { currentScoreDetails, type Finding } from '../../api/prioritizations'

export interface FindingsFilters {
  band: string
  exposure: string
  status: string
  kev: boolean
  text: string
  fromChart: boolean
}

export function parseFilters(params: URLSearchParams): FindingsFilters {
  return {
    band: params.get('band') ?? '',
    exposure: params.get('exposure') ?? '',
    status: params.get('status') ?? '',
    kev: params.get('kev') === '1',
    text: params.get('q') ?? '',
    fromChart: params.get('from') === 'chart',
  }
}

export function hasActiveFilters({ band, exposure, status, kev, text }: FindingsFilters): boolean {
  return !!(band || exposure || status || kev || text)
}

export function matchesFinding(f: Finding, filters: FindingsFilters): boolean {
  const { band, exposure, status, kev, text } = filters
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
  if (status === 'open' && f.closed_at !== null) return false
  if (status === 'closed' && f.closed_at === null) return false
  if (kev && !f.details.kev) return false
  return true
}
