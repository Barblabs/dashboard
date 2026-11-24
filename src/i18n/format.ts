import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/** What a table cell or read-only field shows when it has no value. */
export const EMPTY = '-'

/** The language the UI is shown in, as the locale every `Intl` formatter takes. */
export function useLocale(): string {
  const { i18n } = useTranslation()
  return i18n.resolvedLanguage ?? i18n.language
}

/** A date with its month spelled out, "Nov 11, 2026", so it reads the same in every language. */
const DATE_STYLE = { dateStyle: 'medium' } as const satisfies Intl.DateTimeFormatOptions

export function useDateFormat(): (iso: string) => string {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, DATE_STYLE)
    return (iso) => format.format(new Date(iso))
  }, [locale])
}

/*
 * A calendar day ("2026-11-03") as its month and day: "Nov 3" in English, "3 nov" in Spanish, never
 * a bare "11/3" that reads as March in Spanish. `new Date` reads a date with no time as UTC midnight,
 * so it is formatted in UTC too, or the day would slip back one west of Greenwich.
 */
export function useDayFormat(): (isoDay: string) => string {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    return (isoDay) => format.format(new Date(isoDay))
  }, [locale])
}

/** Two ISO dates as one period, saying once what they share: "Nov 16 – 17, 2026". */
export function useDateRangeFormat(): (start: string, end: string) => string {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, DATE_STYLE)
    return (start, end) => format.formatRange(new Date(start), new Date(end))
  }, [locale])
}

/** A share from 0 to 1 as a whole percentage: "85%" in English, "85 %" in Spanish. */
export function usePercentFormat(): (share: number) => string {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 })
    return (share) => format.format(share)
  }, [locale])
}

/** Joins names the way the UI's language does: "A and B" in English, "A y B" in Spanish. */
export function useListFormat(): (items: string[]) => string {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.ListFormat(locale, { type: 'conjunction' })
    return (items) => format.format(items)
  }, [locale])
}

/** How long ago an ISO date was: in minutes under an hour, hours under a day, and days after that. */
export function useRelativeTime(): (iso: string) => string {
  const { t } = useTranslation()
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.RelativeTimeFormat(locale, { style: 'short' })
    return (iso) => {
      const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
      if (minutes < 1) return t('time.lessThanAMinute')
      if (minutes < 60) return format.format(-minutes, 'minute')
      if (minutes < 24 * 60) return format.format(-Math.floor(minutes / 60), 'hour')
      return format.format(-Math.floor(minutes / (24 * 60)), 'day')
    }
  }, [locale, t])
}
