import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import {
  RELEVANCES,
  useNewsDigestQuery,
  useNewsDigestsQuery,
  type NewsCounts,
  type NewsDigest,
  type NewsDigestSummary,
  type Relevance,
} from '../../api/newsDigests'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Alert } from '../../components/ui/Alert'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Field'
import { Message } from '../../components/ui/Message'
import { Select } from '../../components/ui/Select'
import { useDateRangeFormat } from '../../i18n/format'
import { LABEL } from '../Findings/styles'
import { NewsGroupSection } from './NewsGroupSection'

// The digest being read lives in the URL, so a link or a reload lands on it.
const DIGEST_PARAM = 'digest'

const BUSINESS_CONTEXT_PATH = '/business-context'

const TEXT_LINK = 'focus-ring rounded-sm font-body font-semibold text-nav-active-bg hover:underline'

export function NewsPage() {
  const { t } = useTranslation()
  const query = useNewsDigestsQuery()

  return (
    <Page title={t('news.title')} subtitle={t('news.subtitle')}>
      <QueryBoundary query={query} keys={{ loading: 'news.loading', failed: 'news.failed', network: 'news.network' }}>
        {({ news_digests }) => (news_digests.length === 0 ? <NoDigestYet /> : <Digests digests={news_digests} />)}
      </QueryBoundary>
    </Page>
  )
}

function NoDigestYet() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="font-body text-[0.9375rem] font-semibold text-navy">{t('news.empty.title')}</p>
      <p className="max-w-[40rem] font-body text-[0.875rem] leading-[1.5] text-gray">{t('news.empty.daily')}</p>
      <p className="max-w-[40rem] font-body text-[0.875rem] leading-[1.5] text-gray">{t('news.empty.context')}</p>
      <Link to={BUSINESS_CONTEXT_PATH} className={`${TEXT_LINK} text-[0.875rem]`}>
        {t('news.empty.link')}
      </Link>
    </div>
  )
}

/** The digest the URL names, or the newest; the header stays while another one loads. */
function Digests({ digests }: { digests: NewsDigestSummary[] }) {
  const [params, setParams] = useSearchParams()
  const newest = digests[0]
  const selected = digests.find((d) => d.id === params.get(DIGEST_PARAM)) ?? newest
  const query = useNewsDigestQuery(selected.id)

  // The newest takes no parameter, so the page's own address always opens the newest.
  const select = (id: string) => setParams(id === newest.id ? {} : { [DIGEST_PARAM]: id })

  return (
    <div className="flex flex-col gap-5">
      <DigestHeader digests={digests} selected={selected} onSelect={select} />
      <QueryBoundary
        query={query}
        keys={{ loading: 'news.loadingDigest', failed: 'news.failed', network: 'news.network' }}
      >
        {(digest) => <DigestView digest={digest} />}
      </QueryBoundary>
    </div>
  )
}

interface HeaderProps {
  digests: NewsDigestSummary[]
  selected: NewsDigestSummary
  onSelect: (id: string) => void
}

function DigestHeader({ digests, selected, onSelect }: HeaderProps) {
  const { t } = useTranslation()
  const formatPeriod = useDateRangeFormat()

  const optionText = (digest: NewsDigestSummary) => {
    const { counts } = digest
    const total = counts.named + counts.finding + counts.footprint + counts.peer
    const text = t('news.picker.option', { period: formatPeriod(digest.since, digest.until), count: total })
    return counts.named > 0 ? `${text} · ${t('news.picker.named', { count: counts.named })}` : text
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-title text-[1.25rem] leading-[1.2] text-navy">
          {t('news.period', { period: formatPeriod(selected.since, selected.until) })}
        </p>
        <Counts counts={selected.counts} />
      </div>
      {digests.length > 1 && (
        <Field label={t('news.picker.label')} labelClassName={LABEL} className="w-full max-w-[24rem]">
          <Select value={selected.id} onChange={(event) => onSelect(event.target.value)}>
            {digests.map((digest) => (
              <option key={digest.id} value={digest.id}>
                {optionText(digest)}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  )
}

// Only news that names the Customer gets the strongest badge; attacks on Peers never stand out.
function countVariant(relevance: Relevance, count: number): BadgeVariant {
  if (count === 0 || relevance === 'peer') return 'muted'
  return relevance === 'named' ? 'solid' : 'outline'
}

function Counts({ counts }: { counts: NewsCounts }) {
  const { t } = useTranslation()
  return (
    <ul aria-label={t('news.counts')} className="flex flex-wrap gap-1.5">
      {RELEVANCES.map((relevance) => (
        <li key={relevance}>
          <Badge variant={countVariant(relevance, counts[relevance])}>
            {t(`news.relevance.${relevance}.short`)} <span className="font-semibold tabular-nums">{counts[relevance]}</span>
          </Badge>
        </li>
      ))}
    </ul>
  )
}

function DigestView({ digest }: { digest: NewsDigest }) {
  const { t } = useTranslation()

  return (
    <>
      <p className="font-body text-[0.875rem] text-gray">
        {digest.business_context_version === null
          ? t('findings.summary.noBusinessContext')
          : t('findings.summary.businessContext', { version: digest.business_context_version })}
      </p>

      {digest.editor.status !== 'verified' && <Alert tone="info">{t('news.editorMissing')}</Alert>}

      {digest.no_sectors && (
        <Alert tone="info">
          {t('news.noSectors.text')}{' '}
          <Link to={BUSINESS_CONTEXT_PATH} className={TEXT_LINK}>
            {t('news.noSectors.link')}
          </Link>
        </Alert>
      )}

      {digest.groups.length === 0 ? (
        <Message>{t('news.noItems')}</Message>
      ) : (
        digest.groups.map((group) => <NewsGroupSection key={group.relevance} group={group} />)
      )}
    </>
  )
}
