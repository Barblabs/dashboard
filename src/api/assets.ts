import { useState } from 'react'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { api, errorCode } from './client'
import { connectionScopeKey } from './cmdb'

export const ASSET_KINDS = ['server', 'virtual_machine', 'workstation', 'network_device'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export const CRITICALITIES = ['high', 'medium', 'low'] as const
export type Criticality = (typeof CRITICALITIES)[number]

export const ACTIVITY_FILTERS = ['true', 'false', 'all'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export type SoftwareRole = 'operating_system' | 'application'

export type Exposure = 'internet_facing' | 'internal'

export interface Product {
  vendor: string
  name: string
}

export interface SoftwareComponent {
  role: SoftwareRole
  name: string
  version: string
  /** `null` for an Unidentified Component: threats cannot be checked against it. */
  product: Product | null
}

export interface Hardware {
  vendor: string
  model: string
}

export interface AssetOwner {
  email: string
  source: 'declared' | 'imported'
}

export interface Asset {
  source_id: string
  record_id: string
  name: string
  description: string
  kind: AssetKind
  hardware: Hardware | null
  /** Already in display order. */
  software: SoftwareComponent[]
  criticality: Criticality | null
  exposure: Exposure | null
  owner: AssetOwner | null
  /** What the CMDB reports; independent of whether the Asset is still monitored. */
  retired: boolean
  active: boolean
  inactive_since: string | null
}

export interface AssetsPage {
  assets: Asset[]
  next_cursor: string | null
  /** Assets matching the filters, ignoring paging. */
  total: number
}

export interface AssetFilters {
  active: ActivityFilter
  kind: AssetKind | null
  criticality: Criticality | null
}

const DEFAULT_ASSET_FILTERS: AssetFilters = { active: 'true', kind: null, criticality: null }

export const ASSETS_PAGE_SIZE = 50

// The backend rejects a cursor sent with other filters, so every page request repeats them.
function assetsPath(filters: AssetFilters, cursor: string | null) {
  const params = new URLSearchParams({ limit: String(ASSETS_PAGE_SIZE), active: filters.active })
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.criticality) params.set('criticality', filters.criticality)
  if (cursor) params.set('cursor', cursor)
  return `/assets?${params}`
}

export function assetKey(asset: Pick<Asset, 'source_id' | 'record_id'>) {
  return `${asset.source_id}/${asset.record_id}`
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
  /** Cursors are forward-only: the stack of visited pages is what makes "Previous" possible. */
  cursors: (string | null)[]
}

const FIRST_PAGE: Listing['cursors'] = [null]

function isFiltered({ active, kind, criticality }: AssetFilters) {
  return (
    active !== DEFAULT_ASSET_FILTERS.active ||
    kind !== DEFAULT_ASSET_FILTERS.kind ||
    criticality !== DEFAULT_ASSET_FILTERS.criticality
  )
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

export interface Inventory {
  status: InventoryStatus
  filters: AssetFilters
  pageNumber: number
  /** The inventory spans more than one page, so there is something to navigate. */
  paged: boolean
  canGoBack: boolean
  canGoForward: boolean
  filterBy: (filters: AssetFilters) => void
  next: () => void
  previous: () => void
}

// Only mounted under an active connection: the page renders the inventory in the connected state.
export function useInventory(): Inventory {
  const [listing, setListing] = useState<Listing>({
    filters: DEFAULT_ASSET_FILTERS,
    cursors: FIRST_PAGE,
  })
  const cursor = listing.cursors[listing.cursors.length - 1] ?? null
  const query = useQuery(assetsQuery(listing.filters, cursor))

  // A cursor the backend no longer accepts (stale or tampered) restarts the listing.
  // Reset while rendering: it clears the cursor, so it cannot repeat.
  if (cursor !== null && errorCode(query.error) === 'invalid_request') {
    setListing({ ...listing, cursors: FIRST_PAGE })
  }

  const pageNumber = listing.cursors.length
  const navigating = query.isPlaceholderData
  const nextCursor = query.data?.next_cursor ?? null
  // While the placeholder page shows, its next_cursor belongs to the previous request.
  const forwardCursor = navigating ? null : nextCursor
  const canGoBack = pageNumber > 1 && !navigating

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

  return {
    status,
    filters: listing.filters,
    pageNumber,
    paged: pageNumber > 1 || nextCursor !== null,
    canGoBack,
    canGoForward: forwardCursor !== null,
    // A cursor is only valid with the filters that produced it, so new filters start at page one.
    filterBy: (filters) => setListing({ filters, cursors: FIRST_PAGE }),
    next: () => {
      if (forwardCursor !== null) {
        setListing((current) => ({ ...current, cursors: [...current.cursors, forwardCursor] }))
      }
    },
    previous: () => {
      if (canGoBack) setListing((current) => ({ ...current, cursors: current.cursors.slice(0, -1) }))
    },
  }
}
