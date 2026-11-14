import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { Asset } from './assets'
import { connectionScopeKey } from './cmdb'
import { allAssetPages } from './inventory'

// Beside the inventory pages rather than under their key: it holds a list of Assets, not a page.
const NEEDS_TRIAGE_KEY = [...connectionScopeKey, 'needs-triage'] as const

// What the banner counts and the queue walks through: an Active Asset missing a value a User declares.
function needsTriage(asset: Asset): boolean {
  return asset.active && (asset.exposure.value === null || asset.information_classification.value === null)
}

async function fetchNeedsTriage(): Promise<Asset[]> {
  const pending: Asset[] = []
  for await (const assets of allAssetPages({ active: 'true' })) {
    pending.push(...assets.filter(needsTriage))
  }
  return pending
}

/**
 * Every Active Asset that needs triage, across the whole inventory: `GET /assets` cannot filter
 * by Exposure or Information Classification, so this pages through all of it, apart from the
 * table's filters and page.
 */
export function useNeedsTriageQuery() {
  return useQuery({ queryKey: NEEDS_TRIAGE_KEY, queryFn: fetchNeedsTriage })
}

/**
 * Adds a changed Asset to the count or takes it out, without waiting for the refetch: clearing a
 * Declaration can make an Asset need triage again.
 */
export function showAssetInTriage(queryClient: QueryClient, changed: Asset) {
  queryClient.setQueryData<Asset[]>(NEEDS_TRIAGE_KEY, (pending) => {
    if (!pending) return pending
    const others = pending.filter((asset) => asset.id !== changed.id)
    return needsTriage(changed) ? [...others, changed] : others
  })
}

export function invalidateTriage(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: NEEDS_TRIAGE_KEY })
}
