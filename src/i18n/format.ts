import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/** What a table cell or read-only field shows when it has no value. */
export const EMPTY = '-'

/** The language the UI is shown in, as the locale every `Intl` formatter takes. */
export function useLocale(): string {
  const { i18n } = useTranslation()
  return i18n.resolvedLanguage ?? i18n.language
}

/*
 * `medium` spells the month ("Nov 11, 2026"), for tables; `numeric` is the browser's
 * default short date ("11/11/2026").
 */
const DATE_STYLES = {
  medium: { dateStyle: 'medium' },
  numeric: {},
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

export type DateStyle = keyof typeof DATE_STYLES

export function useDateFormat(style: DateStyle = 'medium'): (iso: string) => string {
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, DATE_STYLES[style])
    return (iso) => format.format(new Date(iso))
  }, [locale, style])
}

/** How long ago an ISO date was, in minutes under an hour and in hours after that. */
export function useRelativeTime(): (iso: string) => string {
  const { t } = useTranslation()
  const locale = useLocale()
  return useMemo(() => {
    const format = new Intl.RelativeTimeFormat(locale, { style: 'short' })
    return (iso) => {
      const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
      if (minutes < 1) return t('time.lessThanAMinute')
      if (minutes < 60) return format.format(-minutes, 'minute')
      return format.format(-Math.floor(minutes / 60), 'hour')
    }
  }, [locale, t])
}
