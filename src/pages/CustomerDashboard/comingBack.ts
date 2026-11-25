import type { ClosedFinding } from '../../api/findingCloses'

const WINDOW_DAYS = 30

export type Returning = Extract<ClosedFinding, { reopen_at: string }>

/** The end of the next `WINDOW_DAYS` days, in which a Finding set aside comes back soon. */
export function comingBackUntil(): number {
  return Date.now() + WINDOW_DAYS * 24 * 60 * 60 * 1000
}

/** The Findings set aside that come back by `comingBackUntil`, soonest first. */
export function returningSoon(closed: ClosedFinding[]): Returning[] {
  const now = Date.now()
  const until = comingBackUntil()
  const inWindow = (at: number) => at > now && at <= until
  return closed
    .flatMap((f) => (f.reopen_at !== null && inWindow(new Date(f.reopen_at).getTime()) ? [f] : []))
    .toSorted((a, b) => new Date(a.reopen_at).getTime() - new Date(b.reopen_at).getTime())
}
