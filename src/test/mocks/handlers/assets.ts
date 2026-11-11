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
import { failure, isOneOf } from './responses'

// Filters like the backend does; every fixture fits on one page, so it never returns a cursor.
export const assetsHandlers = [
  http.get(apiUrl('/assets'), ({ request }) => {
    const params = new URL(request.url).searchParams
    const active = params.get('active') ?? 'true'
    const kind = params.get('kind')
    const criticality = params.get('criticality')
    if (!isOneOf(ACTIVITY_FILTERS, active)) return failure(400, 'invalid_request', 'invalid active')
    if (kind !== null && !isOneOf(ASSET_KINDS, kind)) {
      return failure(400, 'invalid_request', 'unknown kind')
    }
    if (criticality !== null && !isOneOf(CRITICALITIES, criticality)) {
      return failure(400, 'invalid_request', 'unknown criticality')
    }
    if (params.has('cursor')) return failure(400, 'invalid_request', 'malformed cursor')

    const matches = (asset: Asset) =>
      (active === 'all' || asset.active === (active === 'true')) &&
      (kind === null || asset.kind === kind) &&
      (criticality === null || asset.criticality === criticality)
    const assets = mockAssets.filter(matches)
    return HttpResponse.json<AssetsPage>({ assets, next_cursor: null, total: assets.length })
  }),
]
