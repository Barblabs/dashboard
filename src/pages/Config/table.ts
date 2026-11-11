import { useTranslation } from 'react-i18next'

export const NONE = '-'

export const HEADER_CELL =
  'px-4 py-3 text-left font-body text-[0.75rem] font-semibold tracking-[0.06em] whitespace-nowrap text-gray uppercase'
export const CELL = 'border-b border-border-row px-4 py-3.5 align-middle text-navy'
export const MESSAGE = 'px-6 py-12 text-center text-[0.875rem] text-gray'

export function useDateFormat() {
  const { i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    dateStyle: 'medium',
  })
  return (iso: string) => format.format(new Date(iso))
}
