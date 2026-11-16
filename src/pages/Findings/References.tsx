import { useTranslation } from 'react-i18next'
import { MONO } from './styles'

/*
 * URLs come from Feeds and Agents. Only http and https become links, so a `javascript:` URL
 * in a reference cannot run when clicked: it shows as text.
 */
function linkable(url: string): URL | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null
  } catch {
    return null
  }
}

/** Links to the sources of a Finding, each named by its site so a long list scans. */
export function References({ urls }: { urls: string[] }) {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-col">
      {urls.map((url) => {
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
                <span className="sr-only">{t('findings.detail.opensInNewTab')}</span>
              </a>
            ) : (
              <span className={`${MONO} block py-1 break-all text-gray`}>{url}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
