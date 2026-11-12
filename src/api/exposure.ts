import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Asset, AssetsPage, Exposure } from './assets'
import { api, ApiError } from './client'
import { connectionScopeKey } from './cmdb'
import { ASSETS_KEY } from './inventory'
import { listCache } from './listCache'
import { PRIORITIZATIONS_KEY } from './prioritizations'
import type { Known, Schemas } from './schemas'

type DeclareExposureRequest = Known<Schemas['DeclareExposureRequest']>

// The backend's maximum page size: whole-inventory reads take as few requests as possible.
const MAX_PAGE_SIZE = 200

// Beside the inventory pages rather than under their key: it holds a list of Assets, not a page.
const UNKNOWN_EXPOSURE_KEY = [...connectionScopeKey, 'unknown-exposure'] as const

const inventoryPages = listCache<Asset>(ASSETS_KEY, 'assets')

async function* assetPages(filters: Record<string, string>): AsyncGenerator<Asset[]> {
  let cursor: string | null = null
  do {
    const params = new URLSearchParams({ ...filters, limit: String(MAX_PAGE_SIZE) })
    if (cursor) params.set('cursor', cursor)
    const page: AssetsPage = await api.get<AssetsPage>(`/assets?${params}`)
    yield page.assets
    cursor = page.next_cursor
  } while (cursor !== null)
}

async function fetchUnknownExposure(): Promise<Asset[]> {
  const unknown: Asset[] = []
  for await (const assets of assetPages({ active: 'true' })) {
    unknown.push(...assets.filter((asset) => asset.exposure.value === null))
  }
  return unknown
}

/**
 * Every Active Asset with Unknown Exposure, across the whole inventory: `GET /assets` cannot
 * filter by Exposure, so this pages through all of it, apart from the table's filters and page.
 */
export function useUnknownExposureQuery() {
  return useQuery({ queryKey: UNKNOWN_EXPOSURE_KEY, queryFn: fetchUnknownExposure })
}

// There is no `GET /assets/{id}`: the Asset is looked up among those of its Kind, Active or not.
async function fetchAsset(asset: Asset): Promise<Asset | null> {
  for await (const assets of assetPages({ active: 'all', kind: asset.kind })) {
    const found = assets.find((candidate) => candidate.id === asset.id)
    if (found) return found
  }
  return null
}

/** `null` clears the Declaration, falling back to the imported Exposure. */
export interface ExposureChange {
  asset: Asset
  exposure: Exposure | null
}

export interface ExposureSaved {
  asset: Asset
  /** `false` when the change stood but the Asset's open Findings kept their old Scores. */
  rescored: boolean
}

function shows(asset: Asset, exposure: Exposure | null): boolean {
  return exposure === null
    ? asset.exposure.source === 'imported'
    : asset.exposure.source === 'declared' && asset.exposure.value === exposure
}

function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.failure.kind === 'http' && error.failure.status >= 500
}

async function sendChange({ asset, exposure }: ExposureChange): Promise<ExposureSaved> {
  try {
    const saved =
      exposure === null
        ? await api.delete<Asset>(`/assets/${asset.id}/exposure`)
        : await api.put<Asset>(`/assets/${asset.id}/exposure`, { exposure } satisfies DeclareExposureRequest)
    return { asset: saved, rescored: true }
  } catch (error) {
    /*
     * The rescore runs after the Declaration commits, and its failure is a plain 5xx like any
     * other: only the Asset as it is now tells whether the change stood.
     */
    if (!isServerError(error)) throw error
    const current = await fetchAsset(asset).catch(() => null)
    if (current && shows(current, exposure)) return { asset: current, rescored: false }
    throw error
  }
}

/**
 * Declares or clears an Asset's Exposure. It resolves when the change stood, and rejects with
 * the request's `ApiError` when nothing changed (`asset_inactive` when the Asset turned Inactive).
 * `onSaved` runs from the mutation itself, so it still runs when the component that started the
 * change unmounted before the answer came back.
 */
export function useExposureMutation({
  onSaved,
}: {
  onSaved: (saved: ExposureSaved, change: ExposureChange) => void
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sendChange,
    // The response is the Asset as saved: the table and the count show it without waiting.
    onSuccess: (saved, change) => {
      inventoryPages.replace(queryClient, saved.asset)
      queryClient.setQueryData<Asset[]>(UNKNOWN_EXPOSURE_KEY, (unknown) =>
        unknown?.filter((asset) => asset.id !== saved.asset.id || saved.asset.exposure.value === null),
      )
      onSaved(saved, change)
    },
    /*
     * Still refetched after any outcome, without holding the mutation: a failure may follow a
     * change made elsewhere, and a change rescores the Findings.
     */
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ASSETS_KEY })
      void queryClient.invalidateQueries({ queryKey: UNKNOWN_EXPOSURE_KEY })
      void queryClient.invalidateQueries({ queryKey: PRIORITIZATIONS_KEY })
    },
  })
}
