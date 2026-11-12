import { http, HttpResponse } from 'msw'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITIES,
  EXPOSURES,
  type Asset,
  type AssetExposure,
  type AssetsPage,
} from '../../api/assets'
import { importedExposure } from '../assets'
import { assetsStore } from '../assets-store'
import { apiUrl } from '../url'
import { mockCaller } from './auth'
import { failure, isOneOf } from './responses'

type DeclareExposureRequest = { exposure?: unknown }

/*
 * Applies the rules barbackend checks after the body, in its order: the role, then the Asset.
 * `change` returns the new Exposure, or a failure response to send instead.
 */
async function changeExposure(
  id: number,
  change: (asset: Asset) => AssetExposure | Response,
): Promise<Response> {
  if (mockCaller().role !== 'customer_admin') {
    return failure(403, 'forbidden', 'only a customer admin can do this')
  }
  const assets = assetsStore.load()
  const asset = assets.find((a) => a.id === id)
  if (!asset) return failure(404, 'asset_not_found', 'asset not found')
  const exposure = change(asset)
  if (exposure instanceof Response) return exposure
  const updated: Asset = { ...asset, exposure }
  assetsStore.save(assets.map((a) => (a.id === id ? updated : a)))
  return HttpResponse.json(updated)
}

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
    const assets = assetsStore.load().filter(matches)
    return HttpResponse.json<AssetsPage>({ assets, next_cursor: null, total: assets.length })
  }),

  http.put(apiUrl('/assets/:id/exposure'), async ({ params, request }) => {
    const { exposure } = (await request.json()) as DeclareExposureRequest
    // The backend validates the body against its schema before it looks at who is asking.
    if (typeof exposure !== 'string' || !isOneOf(EXPOSURES, exposure)) {
      return failure(400, 'invalid_request', 'exposure must be internet_facing or internal')
    }
    return changeExposure(Number(params['id']), (asset) => {
      if (!asset.active) return failure(409, 'asset_inactive', 'asset is inactive')
      return {
        value: exposure,
        source: 'declared',
        imported: asset.exposure.imported,
        declared_by: mockCaller().email,
        declared_at: new Date().toISOString(),
      }
    })
  }),

  // Clearing is allowed on an Inactive Asset too: only declaring needs it monitored.
  http.delete(apiUrl('/assets/:id/exposure'), ({ params }) =>
    changeExposure(Number(params['id']), (asset) => importedExposure(asset.exposure.imported)),
  ),
]
