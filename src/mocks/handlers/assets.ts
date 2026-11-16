import { http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITY_FILTERS,
  EXPOSURE_FILTERS,
  EXPOSURES,
  INFORMATION_CLASSIFICATION_FILTERS,
  INFORMATION_CLASSIFICATIONS,
  LIFECYCLE_STAGE_FILTERS,
  type Asset,
  type AssetsPage,
} from '../../api/assets'
import { isOneOf, type Known, type Schemas } from '../../api/schemas'
import { importedExposure, UNCLASSIFIED } from '../assets'
import { assetsStore } from '../assets-store'
import { apiUrl } from '../url'
import { mockCaller } from './auth'
import { failure, parsedBody } from './responses'

// barbackend validates the body against its schema before it looks at who is asking.
const declareExposureBody = z.object({ exposure: z.enum(EXPOSURES) }) satisfies ZodType<
  Known<Schemas['DeclareExposureRequest']>
>
const declareInformationClassificationBody = z.object({
  information_classification: z.enum(INFORMATION_CLASSIFICATIONS),
}) satisfies ZodType<Known<Schemas['DeclareInformationClassificationRequest']>>

/*
 * Applies the rules barbackend checks after the body, in its order: the role, then the Asset.
 * `change` returns the fields it changes, or a failure response to send instead.
 */
async function changeAsset(
  id: number,
  change: (asset: Asset) => Partial<Asset> | Response,
): Promise<Response> {
  if (mockCaller().role !== 'customer_admin') {
    return failure(403, 'forbidden', 'only a customer admin can do this')
  }
  const assets = assetsStore.load()
  const asset = assets.find((a) => a.id === id)
  if (!asset) return failure(404, 'asset_not_found', 'asset not found')
  const changed = change(asset)
  if (changed instanceof Response) return changed
  const updated: Asset = { ...asset, ...changed }
  assetsStore.save(assets.map((a) => (a.id === id ? updated : a)))
  return HttpResponse.json(updated)
}

// Filters like the backend does; every fixture fits on one page, so it never returns a cursor.
export const assetsHandlers = [
  http.get(apiUrl('/assets'), ({ request }) => {
    const params = new URL(request.url).searchParams
    const active = params.get('active') ?? 'true'
    const kinds = params.getAll('kind')
    const criticalities = params.getAll('criticality')
    const exposures = params.getAll('exposure')
    const classifications = params.getAll('information_classification')
    const lifecycleStages = params.getAll('lifecycle_stage')
    const areas = params.getAll('area')
    if (!isOneOf(ACTIVITY_FILTERS, active)) return failure(400, 'invalid_request', 'invalid active')
    if (!kinds.every((kind) => isOneOf(ASSET_KINDS, kind))) {
      return failure(400, 'invalid_request', 'unknown kind')
    }
    if (!criticalities.every((criticality) => isOneOf(CRITICALITY_FILTERS, criticality))) {
      return failure(400, 'invalid_request', 'unknown criticality')
    }
    if (!exposures.every((exposure) => isOneOf(EXPOSURE_FILTERS, exposure))) {
      return failure(400, 'invalid_request', 'unknown exposure')
    }
    if (!classifications.every((classification) => isOneOf(INFORMATION_CLASSIFICATION_FILTERS, classification))) {
      return failure(400, 'invalid_request', 'unknown information_classification')
    }
    if (!lifecycleStages.every((stage) => isOneOf(LIFECYCLE_STAGE_FILTERS, stage))) {
      return failure(400, 'invalid_request', 'unknown lifecycle_stage')
    }
    if (!areas.every((area) => /^\d+$/.test(area))) return failure(400, 'invalid_request', 'invalid area')
    if (params.has('cursor')) return failure(400, 'invalid_request', 'malformed cursor')

    const matches = (asset: Asset) =>
      (active === 'all' || asset.active === (active === 'true')) &&
      (kinds.length === 0 || kinds.includes(asset.kind)) &&
      (criticalities.length === 0 || criticalities.includes(asset.criticality ?? 'unknown')) &&
      (exposures.length === 0 || exposures.includes(asset.exposure.value ?? 'unknown')) &&
      (classifications.length === 0 ||
        classifications.includes(asset.information_classification.value ?? 'unclassified')) &&
      (lifecycleStages.length === 0 || lifecycleStages.includes(asset.lifecycle_stage ?? 'unknown')) &&
      (areas.length === 0 || (asset.area !== null && areas.includes(String(asset.area.id))))
    const assets = assetsStore.load().filter(matches)
    return HttpResponse.json<AssetsPage>({ assets, next_cursor: null, total: assets.length })
  }),

  http.put(apiUrl('/assets/:id/exposure'), async ({ params, request }) => {
    const body = await parsedBody(request, declareExposureBody)
    if (body instanceof Response) return body
    const { exposure } = body
    return changeAsset(Number(params['id']), (asset) => {
      if (!asset.active) return failure(409, 'asset_inactive', 'asset is inactive')
      return {
        exposure: {
          value: exposure,
          source: 'declared',
          imported: asset.exposure.imported,
          declared_by: mockCaller().email,
          declared_at: new Date().toISOString(),
        },
      }
    })
  }),

  // Clearing is allowed on an Inactive Asset too: only declaring needs it monitored.
  http.delete(apiUrl('/assets/:id/exposure'), ({ params }) =>
    changeAsset(Number(params['id']), (asset) => ({ exposure: importedExposure(asset.exposure.imported) })),
  ),

  http.put(apiUrl('/assets/:id/information-classification'), async ({ params, request }) => {
    const body = await parsedBody(request, declareInformationClassificationBody)
    if (body instanceof Response) return body
    const { information_classification: value } = body
    return changeAsset(Number(params['id']), (asset) => {
      if (!asset.active) return failure(409, 'asset_inactive', 'asset is inactive')
      return {
        information_classification: {
          value,
          declared_by: mockCaller().email,
          declared_at: new Date().toISOString(),
        },
      }
    })
  }),

  http.delete(apiUrl('/assets/:id/information-classification'), ({ params }) =>
    changeAsset(Number(params['id']), () => ({ information_classification: UNCLASSIFIED })),
  ),
]
