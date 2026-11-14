import type { QueryClient } from '@tanstack/react-query'
import type { Asset } from './assets'
import { invalidateInventory, showAssetInInventory } from './inventory'
import { invalidateTriage, showAssetInTriage } from './triage'

/** A value a Customer Admin declares over an Asset; `null` clears the Declaration. */
export interface DeclarationChange<V> {
  asset: Asset
  value: V | null
}

/** Shows the Asset as a Declaration saved it wherever Assets are listed, without waiting for a refetch. */
export function declarationSaved(queryClient: QueryClient, asset: Asset) {
  showAssetInInventory(queryClient, asset)
  showAssetInTriage(queryClient, asset)
}

/**
 * Refetches the Asset lists after any outcome, without holding the mutation: a failure may
 * follow a change made elsewhere.
 */
export function declarationSettled(queryClient: QueryClient) {
  invalidateInventory(queryClient)
  invalidateTriage(queryClient)
}
