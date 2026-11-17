import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { linkable } from '../../components/linkable'
import { MONO } from './styles'

/*
 * Some CVEs carry dozens of vendor errata. Past this many, the rest wait behind a toggle so the
 * list stays a summary; a small remainder is shown outright since hiding two links saves nothing.
 */
const VISIBLE = 5
const HIDE_AT_LEAST = 3

/** Links to the sources of a Finding, each named by its site so a long list scans. */
export function References({ urls }: { urls: string[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const clamps = urls.length - VISIBLE >= HIDE_AT_LEAST
  const shown = clamps && !open ? urls.slice(0, VISIBLE) : urls

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {shown.map((url) => {
          const parsed = linkable(url)
          return (
            <li key={url} className="min-w-0">
              {parsed ? (
                <a
                  href={parsed.href}
                  target="_blank"
                  rel="noreferrer"
                  title={url}
                  className="focus-ring group flex min-w-0 items-baseline gap-2 rounded-sm py-1 font-body text-[0.8125rem]"
                >
                  <span className="shrink-0 font-semibold text-navy group-hover:underline">
                    {parsed.hostname.replace(/^www\./, '')}
                  </span>
                  <span className="min-w-0 truncate text-gray">{parsed.pathname + parsed.search}</span>
                  <span className="shrink-0 text-gray" aria-hidden="true">
                    ↗
                  </span>
                  <span className="sr-only">{t('common.newTab')}</span>
                </a>
              ) : (
                <span className={`${MONO} block py-1 break-all text-gray`}>{url}</span>
              )}
            </li>
          )
        })}
      </ul>
      {clamps && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="focus-ring cursor-pointer self-start rounded-sm font-body text-[0.8125rem] font-semibold text-nav-active-bg hover:underline"
        >
          {open ? t('findings.detail.showLess') : t('findings.detail.showAllReferences', { count: urls.length })}
        </button>
      )}
    </div>
  )
}
