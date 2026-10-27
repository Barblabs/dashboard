import { useState } from 'react'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type { Asset, AssetFilters, AssetsPage } from './assets'
import { api, errorCode } from './client'
import { connectionScopeKey } from './cmdb'

const DEFAULT_ASSET_FILTERS: AssetFilters = { active: 'true', kind: null, criticality: null }

const ASSETS_PAGE_SIZE = 50

// The backend rejects a cursor sent with other filters, so every page request repeats them.
function assetsPath(filters: AssetFilters, cursor: string | null) {
  const params = new URLSearchParams({ limit: String(ASSETS_PAGE_SIZE), active: filters.active })
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.criticality) params.set('criticality', filters.criticality)
  if (cursor) params.set('cursor', cursor)
  return `/assets?${params}`
}

// The inventory comes from the connected CMDB, so it is dropped on disconnect.
function assetsQuery(filters: AssetFilters, cursor: string | null) {
  return queryOptions({
    queryKey: [...connectionScopeKey, 'assets', filters, cursor],
    queryFn: () => api.get<AssetsPage>(assetsPath(filters, cursor)),
    // An unreadable inventory shows its error right away instead of staying on
    // "Loading" for several seconds while it retries.
    retry: false,
    // Keeps the current page on screen while the next one loads, instead of flashing "Loading".
    placeholderData: keepPreviousData,
  })
}

interface Listing {
  filters: AssetFilters
  /** Cursors are forward-only: the visited pages after the first are what make "Previous" possible. */
  cursors: string[]
}

// Every filter is compared, so a new one counts without touching this check.
function isFiltered(filters: AssetFilters) {
  const keys = Object.keys(DEFAULT_ASSET_FILTERS) as (keyof AssetFilters)[]
  return keys.some((key) => filters[key] !== DEFAULT_ASSET_FILTERS[key])
}

export type InventoryStatus =
  | { state: 'loading' }
  | { state: 'failed'; error: Error; retry: () => void }
  | {
      state: 'ready'
      assets: Asset[]
      total: number
      /** Tells "nothing matches the filters" apart from an empty inventory. */
      filtered: boolean
      /** The assets shown belong to the previous page while the requested one loads. */
      navigating: boolean
    }

export interface Pager {
  page: number
  /** `null` when there is no page to move to, or the requested one is still loading. */
  previous: (() => void) | null
  next: (() => void) | null
}

export interface Inventory {
  status: InventoryStatus
  filters: AssetFilters
  filterBy: (filters: AssetFilters) => void
  /** `null` while the whole inventory fits in one page. */
  pager: Pager | null
}

// Only mounted under an active connection: the page renders the inventory in the connected state.
export function useInventory(): Inventory {
  const [listing, setListing] = useState<Listing>({ filters: DEFAULT_ASSET_FILTERS, cursors: [] })
  const cursor = listing.cursors[listing.cursors.length - 1] ?? null
  const query = useQuery(assetsQuery(listing.filters, cursor))

  // A cursor the backend no longer accepts (stale or tampered) restarts the listing.
  // Reset while rendering: it clears the cursor, so it cannot repeat.
  if (cursor !== null && errorCode(query.error) === 'invalid_request') {
    setListing({ ...listing, cursors: [] })
  }

  const page = listing.cursors.length + 1
  const navigating = query.isPlaceholderData
  const nextCursor = query.data?.next_cursor ?? null

  const status: InventoryStatus = query.isPending
    ? { state: 'loading' }
    : query.isError
      ? { state: 'failed', error: query.error, retry: () => void query.refetch() }
      : {
          state: 'ready',
          assets: query.data.assets,
          total: query.data.total,
          filtered: isFiltered(listing.filters),
          navigating,
        }

  const pager: Pager | null =
    page > 1 || nextCursor !== null
      ? {
          page,
          previous:
            page > 1 && !navigating
              ? () => setListing({ ...listing, cursors: listing.cursors.slice(0, -1) })
              : null,
          // While the placeholder page shows, its next_cursor belongs to the previous request.
          next:
            nextCursor !== null && !navigating
              ? () => setListing({ ...listing, cursors: [...listing.cursors, nextCursor] })
              : null,
        }
      : null

  return {
    status,
    filters: listing.filters,
    // A cursor is only valid with the filters that produced it, so new filters start at page one.
    filterBy: (filters) => setListing({ filters, cursors: [] }),
    pager,
  }
}
