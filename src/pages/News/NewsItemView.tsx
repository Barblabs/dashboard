import { Fragment, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NewsAttack, NewsItem } from '../../api/newsDigests'
import { isOneOf } from '../../api/schemas'
import { linkable } from '../../components/linkable'
import { Badge } from '../../components/ui/Badge'
import { useDateFormat } from '../../i18n/format'
import { useVocab } from '../BusinessContext/vocab'
import { Evidence } from '../Findings/Evidence'
import { LABEL, META, MONO, WRITTEN } from '../Findings/styles'

/** The Feeds of news by the names their sites go by. A Map, so a code like "constructor" cannot hit the prototype. */
const FEED_NAMES = new Map([
  ['therecord', 'The Record'],
  ['thehackernews', 'The Hacker News'],
  ['securityweek', 'SecurityWeek'],
  ['darkreading', 'Dark Reading'],
  ['databreaches', 'DataBreaches.net'],
  ['welivesecurity', 'WeLiveSecurity (ESET)'],
  ['unaaldia', 'Una al día (Hispasec)'],
  ['ransomwarelive', 'Ransomware.live'],
])

const RANSOMWARE_LIVE = 'https://www.ransomware.live'

const EXTERNAL_LINK = 'focus-ring rounded-xs underline-offset-2 hover:underline'

/**
 * One News Item of a digest. Everything in it but the link was written by a Feed, the rules or
 * an Agent: it is shown as plain text, never as markup, and only `link` becomes a link.
 */
export function NewsItemView({ item }: { item: NewsItem }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const id = useId()
  const link = linkable(item.link)

  return (
    <article aria-labelledby={`${id}-title`} className="flex max-w-[72ch] flex-col gap-3">
      <div className="flex flex-col gap-1">
        {item.kind === 'leak_post' && (
          <Badge variant="quiet" className="mb-1 self-start">
            {t('news.item.leakPost')}
          </Badge>
        )}
        <h3 id={`${id}-title`} className="font-body text-[1rem] leading-[1.35] font-semibold text-navy">
          {link ? (
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={EXTERNAL_LINK}>
              <span lang={item.language}>{item.title}</span>
              <span className="text-gray" aria-hidden="true">
                {' '}
                ↗
              </span>
              <span className="sr-only">{t('common.newTab')}</span>
            </a>
          ) : (
            <span lang={item.language}>{item.title}</span>
          )}
        </h3>
        <p className={`${META} flex flex-wrap gap-x-2 text-gray`}>
          <Source feed={item.feed} />
          <span aria-hidden="true">·</span>
          <time dateTime={item.published_at}>{formatDate(item.published_at)}</time>
        </p>
      </div>

      {/* Written by code so that nobody misses them: every Peer is context, every leak post a claim. */}
      {item.labels.length > 0 && (
        <ul aria-label={t('news.item.labels')} lang="es" className="flex flex-col gap-1.5">
          {item.labels.map((label, i) => (
            <li
              key={i}
              className="rounded-sm bg-navy/5 px-3 py-1.5 font-body text-[0.875rem] leading-[1.4] font-medium text-navy"
            >
              {label}
            </li>
          ))}
        </ul>
      )}

      {item.why !== null && (
        <Labeled id={`${id}-why`} label={t('news.item.why')}>
          <p lang="es" className={`${WRITTEN} text-navy`}>
            {item.why}
          </p>
          <Evidence label={t('findings.detail.why.contextEvidence')} items={item.context_evidence} fromContext />
        </Labeled>
      )}

      {item.summary !== null ? (
        <p lang="es" className={`${WRITTEN} text-navy`}>
          {item.summary}
        </p>
      ) : (
        item.excerpt !== null && (
          <figure className="flex flex-col gap-1 border-l-2 border-muted-bg pl-3">
            <figcaption className={LABEL}>{t('news.item.excerpt')}</figcaption>
            <blockquote lang={item.language} className={`${WRITTEN} text-gray`}>
              {item.excerpt}
            </blockquote>
          </figure>
        )
      )}

      {item.reasons.length > 0 && (
        <Labeled id={`${id}-reasons`} label={t('news.item.reasons')}>
          <ul
            aria-labelledby={`${id}-reasons`}
            lang="es"
            className="flex list-disc flex-col gap-0.5 pl-5 font-body text-[0.8125rem] leading-[1.5] text-navy"
          >
            {item.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </Labeled>
      )}

      {item.attacks.length > 0 && (
        <Labeled id={`${id}-attacks`} label={t('news.item.attacks')}>
          <Attacks labelledBy={`${id}-attacks`} attacks={item.attacks} />
        </Labeled>
      )}

      {item.cve_ids.length > 0 && (
        <ul aria-label={t('news.item.cves')} className="flex flex-wrap gap-1.5">
          {item.cve_ids.map((cve) => (
            <li key={cve} className={`${MONO} rounded-sm border border-border-panel bg-panel px-2 py-0.5 text-navy`}>
              {cve}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function Labeled({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className={LABEL}>
        {label}
      </span>
      {children}
    </div>
  )
}

/*
 * Ransomware.live's terms ask for attribution wherever its data is shown, so its name links to
 * its site on every item it published.
 */
function Source({ feed }: { feed: string }) {
  const { t } = useTranslation()
  const source = t('news.item.source', { name: FEED_NAMES.get(feed) ?? feed })
  if (feed !== 'ransomwarelive') return <span>{source}</span>

  return (
    <a href={RANSOMWARE_LIVE} target="_blank" rel="noopener noreferrer" className={`${EXTERNAL_LINK} text-navy`}>
      {source}
      <span className="sr-only"> {t('common.newTab')}</span>
    </a>
  )
}

/** Each attack as compact facts: victim · sectors · countries · kind · attacker. */
function Attacks({ labelledBy, attacks }: { labelledBy: string; attacks: NewsAttack[] }) {
  const { t } = useTranslation()
  const sectors = useVocab('sectors')
  const countries = useVocab('countries')
  const concerns = useVocab('concerns')

  // Codes outside the vocabularies, from an older Reader, show as they are.
  const sectorName = (code: string) => (isOneOf(sectors.codes, code) ? sectors.labelOf(code) : code)
  const countryName = (code: string) => (isOneOf(countries.codes, code) ? countries.labelOf(code) : code)
  const kindName = (code: string) => (isOneOf(concerns.codes, code) ? concerns.labelOf(code) : code)

  return (
    <ul aria-labelledby={labelledBy} className="flex flex-col gap-1">
      {attacks.map((attack, i) => {
        const facts = [
          attack.sectors.map(sectorName).join(', '),
          attack.countries.map(countryName).join(', '),
          attack.kind === null ? '' : kindName(attack.kind),
          attack.attacker === null ? '' : t('news.attack.attacker', { name: attack.attacker }),
        ].filter((fact) => fact !== '')

        return (
          <li key={i} className="font-body text-[0.8125rem] leading-[1.5] text-navy">
            {attack.victim === '' ? (
              <span className="text-gray">{t('news.attack.noVictim')}</span>
            ) : (
              <span className="font-semibold">{attack.victim}</span>
            )}
            {attack.domain !== null && <span className={`${MONO} text-gray`}> ({attack.domain})</span>}
            {facts.map((fact, j) => (
              <Fragment key={j}>
                <span className="text-gray">{' · '}</span>
                <span>{fact}</span>
              </Fragment>
            ))}
          </li>
        )
      })}
    </ul>
  )
}
