import type { QueryClient, QueryKey } from '@tanstack/react-query'

/*
 * The cached lists of one resource: every query under `key` holds a response such as
 * `{ users: [...] }`, with the items in `field`. An update reaches every query under `key`,
 * so a list cached once per filter (areas by activity) gets the change in all its variants.
 * A list not in the cache is left alone: the next read fetches it whole instead of showing
 * only the mutated item.
 */
export function listCache<T extends { id: string | number }>(key: QueryKey, field: string) {
  function update(queryClient: QueryClient, change: (items: T[]) => T[]) {
    queryClient.setQueriesData<Record<string, T[]>>({ queryKey: key }, (prev) =>
      prev ? { ...prev, [field]: change(prev[field]) } : prev,
    )
  }

  return {
    replace: (queryClient: QueryClient, item: T) =>
      update(queryClient, (items) => items.map((existing) => (existing.id === item.id ? item : existing))),
    append: (queryClient: QueryClient, item: T) => update(queryClient, (items) => [...items, item]),
  }
}
