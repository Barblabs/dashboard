import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Schemas } from './schemas'

export type CloseTimeBand = Schemas['CloseTimeResponse']
export type WeeklyTrendPoint = Schemas['WeekResponse']
export type WeeklyTrendResponse = Schemas['WeeklyTrendResponse']
export type TimeToCloseResponse = Schemas['TimeToCloseResponse']

export function useWeeklyTrendQuery() {
  return useQuery({
    queryKey: ['findings-weekly-trend'],
    queryFn: () => api.get<WeeklyTrendResponse>('/findings/weekly-trend'),
  })
}

export function useTimeToCloseQuery() {
  return useQuery({
    queryKey: ['findings-time-to-close'],
    queryFn: () => api.get<TimeToCloseResponse>('/findings/time-to-close'),
  })
}
