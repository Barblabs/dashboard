/** A Score Band, which the UI calls the risk level, or `unbanded` for a Score of a Model without Bands. */
export const BANDS = ['critical', 'high', 'medium', 'low', 'unbanded'] as const
export type Band = (typeof BANDS)[number]

/** Low and no level read apart: Low is the gray of text, no level the lighter gray of disabled things. */
export const BAND_COLORS: Record<Band, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  medium: 'var(--color-medium)',
  low: 'var(--color-low)',
  unbanded: 'var(--color-muted-bg)',
}
