import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import { findingsStatsScopeKey } from './findingsSummary'
import type { Schemas } from './schemas'

export type CloseTimeBand = Schemas['CloseTimeResponse']
export type WeeklyTrendPoint = Schemas['WeekResponse']
export type WeeklyTrendResponse = Schemas['WeeklyTrendResponse']
export type TimeToCloseResponse = Schemas['TimeToCloseResponse']

export function useWeeklyTrendQuery() {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'weekly-trend'],
    queryFn: () => api.get<WeeklyTrendResponse>('/findings/weekly-trend'),
  })
}

export function useTimeToCloseQuery() {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'time-to-close'],
    queryFn: () => api.get<TimeToCloseResponse>('/findings/time-to-close'),
  })
}
