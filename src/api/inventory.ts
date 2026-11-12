import { useState } from 'react'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type { Asset, AssetFilters, AssetsPage } from './assets'
import { api, errorCode } from './client'
import { connectionScopeKey } from './cmdb'
import type { Loadable } from './loadable'

const DEFAULT_ASSET_FILTERS: AssetFilters = { active: 'true', kind: null, criticality: null }

const ASSETS_PAGE_SIZE = 50

// The backend's maximum: reading the whole inventory takes as few requests as possible.
const MAX_ASSETS_PAGE_SIZE = 200

// The backend rejects a cursor sent with other filters, so every page request repeats them.
function assetsPath(filters: AssetFilters, cursor: string | null, limit: number) {
  const params = new URLSearchParams({ limit: String(limit), active: filters.active })
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.criticality) params.set('criticality', filters.criticality)
  if (cursor) params.set('cursor', cursor)
  return `/assets?${params}`
}

/** Every Asset matching the filters, one page of the backend's maximum size at a time. */
export async function* allAssetPages(filters: Partial<AssetFilters>): AsyncGenerator<Asset[]> {
  const complete = { ...DEFAULT_ASSET_FILTERS, ...filters }
  let cursor: string | null = null
  do {
    const page: AssetsPage = await api.get<AssetsPage>(assetsPath(complete, cursor, MAX_ASSETS_PAGE_SIZE))
    yield page.assets
    cursor = page.next_cursor
  } while (cursor !== null)
}

// The inventory comes from the connected CMDB, so it is dropped on disconnect.
export const ASSETS_KEY = [...connectionScopeKey, 'assets'] as const

function assetsQuery(filters: AssetFilters, cursor: string | null) {
  return queryOptions({
    queryKey: [...ASSETS_KEY, filters, cursor],
    queryFn: () => api.get<AssetsPage>(assetsPath(filters, cursor, ASSETS_PAGE_SIZE)),
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

export interface Pager {
  page: number
  /** `null` when there is no page to move to, or the requested one is still loading. */
  previous: (() => void) | null
  next: (() => void) | null
}

export interface Inventory {
  query: Loadable<AssetsPage>
  /** Tells "nothing matches the filters" apart from an empty inventory. */
  filtered: boolean
  /** The assets shown belong to the previous page while the requested one loads. */
  navigating: boolean
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
    query,
    filtered: isFiltered(listing.filters),
    navigating,
    filters: listing.filters,
    // A cursor is only valid with the filters that produced it, so new filters start at page one.
    filterBy: (filters) => setListing({ filters, cursors: [] }),
    pager,
  }
}
