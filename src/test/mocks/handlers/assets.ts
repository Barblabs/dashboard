import { http, HttpResponse } from 'msw'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITIES,
  type Asset,
  type AssetsPage,
} from '../../../api/assets'
import { mockAssets } from '../assets'
import { apiUrl } from '../url'

function invalidRequest(error: string) {
  return HttpResponse.json({ code: 'invalid_request', error }, { status: 400 })
}

function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
  return options.some((option) => option === value)
}

// Filters like the backend does; every fixture fits on one page, so it never returns a cursor.
export const assetsHandlers = [
  http.get(apiUrl('/assets'), ({ request }) => {
    const params = new URL(request.url).searchParams
    const active = params.get('active') ?? 'true'
    const kind = params.get('kind')
    const criticality = params.get('criticality')
    if (!isOneOf(ACTIVITY_FILTERS, active)) return invalidRequest('invalid active')
    if (kind !== null && !isOneOf(ASSET_KINDS, kind)) return invalidRequest('unknown kind')
    if (criticality !== null && !isOneOf(CRITICALITIES, criticality)) {
      return invalidRequest('unknown criticality')
    }
    if (params.has('cursor')) return invalidRequest('malformed cursor')

    const matches = (asset: Asset) =>
      (active === 'all' || asset.active === (active === 'true')) &&
      (kind === null || asset.kind === kind) &&
      (criticality === null || asset.criticality === criticality)
    const assets = mockAssets.filter(matches)
    return HttpResponse.json<AssetsPage>({ assets, next_cursor: null, total: assets.length })
  }),
]
