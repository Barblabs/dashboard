import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** A list response as the backend sends it, e.g. `{ users: [...] }`. */
type ListResponse<F extends string, T> = Record<F, T[]>

/*
 * Each helper updates every cached query under `key`, so a list cached once per filter
 * (areas by activity) gets the change in all its variants. Every query under `key` must
 * hold a list in `field`. A list not in the cache is left alone: the next read fetches it
 * whole instead of showing only the mutated item.
 */
function updateLists<F extends string, T>(
  queryClient: QueryClient,
  key: QueryKey,
  field: F,
  update: (items: T[]) => T[],
) {
  queryClient.setQueriesData<ListResponse<F, T>>({ queryKey: key }, (prev) =>
    prev ? { ...prev, [field]: update(prev[field]) } : prev,
  )
}

export function replaceById<F extends string, T extends { id: string | number }>(
  queryClient: QueryClient,
  key: QueryKey,
  field: F,
  item: T,
) {
  updateLists<F, T>(queryClient, key, field, (items) =>
    items.map((existing) => (existing.id === item.id ? item : existing)),
  )
}

export function appendTo<F extends string, T>(
  queryClient: QueryClient,
  key: QueryKey,
  field: F,
  item: T,
) {
  updateLists<F, T>(queryClient, key, field, (items) => [...items, item])
}
