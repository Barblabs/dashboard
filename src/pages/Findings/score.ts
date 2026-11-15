/** The Score, from 0 to 1 in the API, as the 0 to 100 the dashboard shows (ADR 0032). */
export function scorePoints(value: number): number {
  return Math.round(value * 100)
}
