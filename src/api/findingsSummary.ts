import { useQuery } from '@tanstack/react-query'
import { api } from './client'
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

const findingsSummaryKey = ['findings-summary'] as const

export function useFindingsSummaryQuery() {
  return useQuery({
    queryKey: findingsSummaryKey,
    queryFn: () => api.get<FindingsSummary>('/findings/summary'),
  })
}
