import { useQuery, type QueryClient } from '@tanstack/react-query'
import { missingValues, type Asset, type AssetFilters } from './assets'
import { connectionScopeKey } from './cmdb'
import { allAssetPages } from './inventory'

// Beside the inventory pages rather than under their key: it holds a list of Assets, not a page.
const NEEDS_TRIAGE_KEY = [...connectionScopeKey, 'needs-triage'] as const

// What the banner counts and the queue walks through: an Active Asset missing a value a User declares.
function needsTriage(asset: Asset): boolean {
  return asset.active && missingValues(asset).length > 0
}

async function fetchAll(filters: Partial<AssetFilters>): Promise<Asset[]> {
  const assets: Asset[] = []
  for await (const page of allAssetPages(filters)) assets.push(...page)
  return assets
}

/*
 * Filters combine with AND, so the OR triage needs takes two requests. An Asset missing both
 * values comes back from each and counts once; the queue asks for the Unknown Exposures first.
 */
async function fetchNeedsTriage(): Promise<Asset[]> {
  const [unknownExposure, unclassified] = await Promise.all([
    fetchAll({ active: 'true', exposure: ['unknown'] }),
    fetchAll({ active: 'true', information_classification: ['unclassified'] }),
  ])
  const ids = new Set(unknownExposure.map((asset) => asset.id))
  return [...unknownExposure, ...unclassified.filter((asset) => !ids.has(asset.id))]
}

/** Every Active Asset that needs triage, across the whole inventory, apart from the table's filters and page. */
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
