import type { WeeklyTrendPoint } from '../../api/findingsTrend'

/** The weeks from the first one with anything in it: the empty weeks before say nothing. A week empty later on stays. */
export function fromFirstRecord(weeks: WeeklyTrendPoint[]): WeeklyTrendPoint[] {
  const first = weeks.findIndex((w) => w.opened > 0 || w.closed > 0 || w.open_at_end > 0)
  return first === -1 ? [] : weeks.slice(first)
}
