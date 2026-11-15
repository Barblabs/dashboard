import { useTranslation } from 'react-i18next'

function isSafeUrl(href: string): boolean {
  try {
    const { protocol } = new URL(href)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Renders http/https URLs as links opening in a new tab; anything else is plain text. */
export function ExternalLink({ href, className = '' }: { href: string; className?: string }) {
  const { t } = useTranslation()
  if (!isSafeUrl(href)) return <span className={`text-gray ${className}`}>{href}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-navy underline-offset-2 hover:underline focus-ring ${className}`}
    >
      {href}
      <span className="sr-only"> {t('common.newTab')}</span>
    </a>
  )
}
