import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Asset, InformationClassification } from './assets'
import { api } from './client'
import { declarationSaved, declarationSettled, type DeclarationChange } from './declarations'
import type { Known, Schemas } from './schemas'

type DeclareInformationClassificationRequest = Known<Schemas['DeclareInformationClassificationRequest']>

/** `null` clears the Declaration, leaving the Asset Unclassified. */
export type InformationClassificationChange = DeclarationChange<InformationClassification>

function sendChange({ asset, value }: InformationClassificationChange): Promise<Asset> {
  const path = `/assets/${asset.id}/information-classification`
  return value === null
    ? api.delete<Asset>(path)
    : api.put<Asset>(path, {
        information_classification: value,
      } satisfies DeclareInformationClassificationRequest)
}

/**
 * Declares or clears an Asset's Information Classification. Nothing is scored from it, so unlike
 * Exposure there is no rescore to fall back from: it resolves with the Asset as saved, or rejects
 * with the request's `ApiError` (`asset_inactive` when the Asset turned Inactive).
 */
export function useInformationClassificationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sendChange,
    onSuccess: (saved) => declarationSaved(queryClient, saved),
    onSettled: () => declarationSettled(queryClient),
  })
}
