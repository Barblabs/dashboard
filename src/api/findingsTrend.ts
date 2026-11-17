import { useQuery } from '@tanstack/react-query'
import { api } from './client'

interface WeeklyTrendPoint {
  week: string
  opened: number
  closed: number
  backlog: number
}

export interface WeeklyTrendResponse {
  weeks: WeeklyTrendPoint[]
}

interface TimeToClosePoint {
  band: string
  median_days: number
  count: number
}

export interface TimeToCloseResponse {
  bands: TimeToClosePoint[]
}

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
