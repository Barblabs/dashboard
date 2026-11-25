import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import { findingsStatsScopeKey } from './findingsSummary'
import type { Schemas } from './schemas'

export type WeeklyTrendPoint = Schemas['WeekResponse']
type WeeklyTrendResponse = Schemas['WeeklyTrendResponse']

export function useWeeklyTrendQuery() {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'weekly-trend'],
    queryFn: () => api.get<WeeklyTrendResponse>('/findings/weekly-trend'),
  })
}
