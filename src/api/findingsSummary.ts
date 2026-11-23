import { useQuery, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import type { Schemas } from './schemas'

// Band counts come from an embedded Go struct that the OpenAPI spec generator
// does not reflect, but the Go JSON marshaler always serializes them.
export type FindingsSummary = Schemas['FindingsSummaryResponse'] & {
  critical: number
  high: number
  medium: number
  low: number
  unbanded: number
}

/**
 * The counts and charts over the Customer's Findings key their queries under this, so a change
 * to the Findings refreshes all of them, and a Sync or a Disconnect does too.
 */
export const findingsStatsScopeKey = [...connectionScopeKey, 'findings-stats'] as const

/** Refetches the counts and charts after a change that opens, closes or rescores Findings. */
export function invalidateFindingsStats(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: findingsStatsScopeKey })
}

const findingsSummaryKey = [...findingsStatsScopeKey, 'summary'] as const

export function useFindingsSummaryQuery() {
  return useQuery({
    queryKey: findingsSummaryKey,
    queryFn: () => api.get<FindingsSummary>('/findings/summary'),
  })
}
