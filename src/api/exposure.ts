import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Asset, Exposure } from './assets'
import { api, ApiError } from './client'
import { allAssetPages } from './inventory'
import { declarationSaved, declarationSettled, type DeclarationChange } from './declarations'
import type { Known, Schemas } from './schemas'

type DeclareExposureRequest = Known<Schemas['DeclareExposureRequest']>

// There is no `GET /assets/{id}`: the Asset is looked up among those of its Kind, Active or not.
async function fetchAsset(asset: Asset): Promise<Asset | null> {
  for await (const assets of allAssetPages({ active: 'all', kind: asset.kind })) {
    const found = assets.find((candidate) => candidate.id === asset.id)
    if (found) return found
  }
  return null
}

/** `null` clears the Declaration, falling back to the imported Exposure. */
export type ExposureChange = DeclarationChange<Exposure>

export interface ExposureSaved {
  asset: Asset
  /** `false` when the change stood but the Asset's open Findings kept their old Scores. */
  rescored: boolean
}

function shows(asset: Asset, value: Exposure | null): boolean {
  return value === null
    ? asset.exposure.source === 'imported'
    : asset.exposure.source === 'declared' && asset.exposure.value === value
}

function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.failure.kind === 'http' && error.failure.status >= 500
}

async function sendChange({ asset, value }: ExposureChange): Promise<ExposureSaved> {
  try {
    const saved =
      value === null
        ? await api.delete<Asset>(`/assets/${asset.id}/exposure`)
        : await api.put<Asset>(`/assets/${asset.id}/exposure`, { exposure: value } satisfies DeclareExposureRequest)
    return { asset: saved, rescored: true }
  } catch (error) {
    /*
     * The rescore runs after the Declaration commits, and its failure is a plain 5xx like any
     * other: only the Asset as it is now tells whether the change stood.
     */
    if (!isServerError(error)) throw error
    const current = await fetchAsset(asset).catch(() => null)
    if (current && shows(current, value)) return { asset: current, rescored: false }
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
    onSuccess: (saved, change) => {
      declarationSaved(queryClient, saved.asset)
      onSaved(saved, change)
    },
    // Not awaited, so the mutation settles without waiting for the refetches.
    onSettled: () => declarationSettled(queryClient),
  })
}
