import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  currentAsset,
  currentScoreDetails,
  findingInformationClassification,
  type CurrentOrder,
  type Finding,
  type FindingAsset,
  type FindingDetails,
  type Technique,
} from '../../api/prioritizations'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ChevronRightIcon } from '../../components/ui/icons'
import { EMPTY, useDateFormat, useLocale, usePercentFormat } from '../../i18n/format'
import { informationClassificationLabel } from '../Config/assetText'
import { ActionPlanSection } from './ActionPlanSection'
import { Evidence } from './Evidence'
import { FeedbackSection } from './FeedbackSection'
import { FindingBadges } from './GroupPanel'
import { References } from './References'
import { scorePoints } from './score'
import { ScoreBandBadge } from './ScoreBandBadge'
import { HEADING, LABEL, META, MONO, READING } from './styles'
import { ClampedText, WrittenText } from './WrittenText'

interface Props {
  order: CurrentOrder
  finding: Finding
  onClose: () => void
  closeButton?: RefObject<HTMLButtonElement | null>
}

type SectionId = 'why' | 'plan' | 'threats' | 'vulnerability' | 'asset' | 'score' | 'advisories' | 'references' | 'feedback'

const SECTION_TITLES: Record<SectionId, ParseKeys> = {
  why: 'findings.detail.sections.why',
  plan: 'findings.detail.sections.plan',
  threats: 'findings.detail.sections.threats',
  vulnerability: 'findings.detail.sections.vulnerability',
  asset: 'findings.detail.sections.asset',
  score: 'findings.detail.sections.score',
  advisories: 'findings.detail.sections.advisories',
  references: 'findings.detail.vulnerability.references',
  feedback: 'findings.detail.sections.feedback',
}

/**
 * Everything known of one Finding: why it has its place, what it is, and what to do about it.
 * The facts that decide how urgent it is stay in a rail that never scrolls away; the column
 * beside it reads top to bottom, and the rail's index follows where the reader is.
 */
export function FindingDetail({ order, finding, onClose, closeButton }: Props) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const column = useRef<HTMLDivElement>(null)
  const group = order.prioritization.groups.find((g) => g.position === finding.group)
  const { details } = finding

  const sections: SectionId[] = [
    ...(group ? (['why'] as const) : []),
    'plan',
    'threats',
    'vulnerability',
    'asset',
    'score',
    'advisories',
    ...(details.references.length > 0 ? (['references'] as const) : []),
    'feedback',
  ]
  const sectionId = (id: SectionId) => `${idPrefix}-${id}`
  const active = useActiveSection(column, sections.map(sectionId))

  const jump = (id: SectionId) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(sectionId(id))?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const counts: Partial<Record<SectionId, number>> = {
    threats: details.techniques.length,
    advisories: details.advisories.length,
    references: details.references.length,
  }

  const groupEvidence = group?.evidence.filter((e) => e.finding_id === finding.finding_id) ?? []
  const contextEvidence = group?.context_evidence ?? []

  const content: Record<SectionId, ReactNode> = {
    why: group && (
      <>
        <WrittenText text={group.reason} marks={[...groupEvidence, ...contextEvidence].map((e) => e.value)} lead />
        <div className="flex flex-col gap-2">
          <Evidence label={t('findings.detail.why.evidence')} items={groupEvidence} />
          <Evidence label={t('findings.detail.why.contextEvidence')} items={contextEvidence} fromContext />
        </div>
      </>
    ),
    plan: <ActionPlanSection order={order} finding={finding} />,
    threats: <Threats details={details} />,
    vulnerability: <Vulnerability details={details} />,
    asset: <AssetDetails finding={finding} />,
    score: <ScoreDetails finding={finding} />,
    advisories: <Advisories details={details} />,
    references: <References urls={details.references} />,
    feedback: <FeedbackSection order={order} finding={finding} />,
  }

  // Narrow screens stack the rail over the column and scroll both together; from md up each scrolls on its own.
  return (
    <div className="h-full overflow-y-auto md:grid md:grid-cols-[17.5rem_minmax(0,1fr)] md:overflow-hidden">
      <aside className="flex flex-col gap-5 border-b border-border-panel bg-panel px-5 py-6 md:min-h-0 md:overflow-y-auto md:border-r md:border-b-0">
        <Rail order={order} finding={finding} />

        <nav aria-label={t('findings.detail.onThisFinding')} className="hidden flex-col md:flex">
          <span className={`${LABEL} mb-1.5`}>{t('findings.detail.onThisFinding')}</span>
          {sections.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => jump(id)}
              aria-current={active === sectionId(id) ? 'location' : undefined}
              className="focus-ring flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left font-body text-[0.8125rem] text-gray transition-colors duration-150 ease-out hover:text-navy aria-[current]:bg-white aria-[current]:font-semibold aria-[current]:text-navy aria-[current]:shadow-[0_1px_2px_rgba(15,56,91,0.08)]"
            >
              {t(SECTION_TITLES[id])}
              {(counts[id] ?? 0) > 0 && <span className="text-[0.6875rem] text-gray tabular-nums">{counts[id]}</span>}
            </button>
          ))}
        </nav>

        <p className="font-body text-[0.6875rem] leading-[1.4] text-gray md:mt-auto">{t('findings.detail.plainText')}</p>
      </aside>

      <div ref={column} className="relative md:min-h-0 md:overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/85 px-6 py-3 backdrop-blur-md md:px-8">
          <span className={`${LABEL} truncate`}>
            {group && t('findings.detail.why.group', { position: group.position, title: group.title })}
          </span>
          <Button ref={closeButton} variant="secondary" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        <article className="flex flex-col gap-10 px-6 pt-2 pb-16 md:px-8">
          {sections.map((id) => (
            <section key={id} id={sectionId(id)} aria-labelledby={`${sectionId(id)}-title`} className="flex scroll-mt-16 flex-col gap-3.5">
              <h3 id={`${sectionId(id)}-title`} className={HEADING}>
                {t(SECTION_TITLES[id])}
              </h3>
              {content[id]}
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}

/*
 * The section being read: the last whose top has passed the upper third of the column, or
 * the last section once the column is scrolled to its end, since a short one never gets there.
 */
function useActiveSection(column: RefObject<HTMLElement | null>, ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0])
  // A string, so the effect reruns when the sections change rather than on every new array.
  const joined = ids.join(' ')

  useEffect(() => {
    const root = column.current
    if (!root) return undefined
    const sections = joined.split(' ')
    const onScroll = () => {
      const limit = root.getBoundingClientRect().top + root.clientHeight / 3
      let current: string | undefined = sections[0]
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= limit) current = id
      }
      if (root.scrollHeight > root.clientHeight && root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
        current = sections.at(-1)
      }
      setActive(current)
    }
    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [column, joined])

  return active
}

/* ---------- Rail ---------- */

type Tone = 'alarm' | 'warn' | 'plain' | 'quiet'

const TONE_DOT: Record<Tone, string> = {
  alarm: 'bg-critical',
  warn: 'bg-high',
  plain: 'bg-navy/40',
  quiet: 'bg-muted-bg',
}

interface Signal {
  label: string
  value: string
  note?: string
  tone: Tone
}

/** CVSS calls 9.0 and above Critical. */
const CVSS_CRITICAL = 9

/** EPSS close to 1 must not round up to a certain 100%: it is floored to two decimals of a percent. */
function useEpssFormat() {
  const locale = useLocale()
  const format = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 })
  return (share: number) => format.format(Math.floor(share * 10000) / 10000)
}

function useSignals(finding: Finding): Signal[] {
  const { t } = useTranslation()
  const epssFormat = useEpssFormat()
  const { kev, epss, cvss } = finding.details
  const asset = currentAsset(finding)
  const top = cvss.toSorted((a, b) => b.base_score - a.base_score)[0]

  return [
    {
      label: t('findings.detail.vulnerability.kev'),
      value: !kev
        ? t('findings.detail.vulnerability.notInKev')
        : kev.known_ransomware_campaign_use === 'Known'
          ? t('findings.badges.ransomware')
          : t('findings.detail.signals.exploited'),
      note: kev ? t('findings.detail.signals.since', { date: kev.date_added }) : undefined,
      tone: kev ? 'alarm' : 'quiet',
    },
    {
      label: t('findings.detail.vulnerability.epss'),
      value: epss ? epssFormat(epss.probability) : t('findings.detail.signals.pending'),
      // Never "Top 0%": the share above it is at least a hundredth of a percent.
      note: epss ? t('findings.detail.signals.top', { share: epssFormat(Math.max(0.0001, 1 - epss.percentile)) }) : undefined,
      tone: epss ? 'plain' : 'quiet',
    },
    {
      label: t('findings.detail.score.factors.alpha'),
      value: top ? String(top.base_score) : EMPTY,
      note: top ? t('findings.detail.signals.cvssVersion', { version: top.version }) : undefined,
      tone: !top ? 'quiet' : top.base_score >= CVSS_CRITICAL ? 'warn' : 'plain',
    },
    {
      label: t('findings.detail.asset.exposure'),
      value: t(`config.inventory.exposure.${asset.exposure}`),
      tone: asset.exposure === 'internet_facing' ? 'warn' : 'plain',
    },
    {
      label: t('findings.detail.asset.criticality'),
      value: t(`config.inventory.criticality.${asset.criticality}`),
      tone: asset.criticality === 'high' ? 'warn' : 'plain',
    },
  ]
}

function Rail({ order, finding }: { order: CurrentOrder; finding: Finding }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const score = currentScoreDetails(finding)
  const signals = useSignals(finding)

  return (
    <>
      <div className="flex flex-col gap-1">
        <Dialog.Title className="font-mono text-[1.25rem] leading-tight font-semibold text-navy">{finding.cve_id}</Dialog.Title>
        <span className="font-body text-[0.875rem] text-navy">
          {finding.component} {finding.version}
        </span>
        <span className={`${META} text-gray`}>{finding.asset_name}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-title text-[2.5rem] leading-none text-navy">{scorePoints(score.value)}</span>
        <span className={`${META} text-gray`}>{t('findings.detail.score.rank', { rank: finding.score_rank })}</span>
        <span className="flex flex-wrap gap-1.5">
          <ScoreBandBadge band={score.band} />
          <FindingBadges order={order} finding={finding} />
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:flex md:flex-col md:gap-0">
        {signals.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3 md:border-b md:border-border-row md:py-2 md:last:border-b-0"
          >
            <dt className={`${META} flex items-center gap-2 text-gray`}>
              <span className={`size-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`} aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="md:text-right">
              <span className={`${META} font-semibold ${s.tone === 'quiet' ? 'text-gray' : 'text-navy'}`}>{s.value}</span>
              {s.note && <span className="block font-body text-[0.6875rem] text-gray">{s.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className={`${META} text-gray`}>
        {t('findings.detail.placed', { date: formatDate(finding.placed_at) })}
        {finding.closed_at && ` · ${t('findings.detail.closedOn', { date: formatDate(finding.closed_at) })}`}
      </p>
    </>
  )
}

/* ---------- Sections ---------- */

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className={LABEL}>{label}</dt>
      <dd className="font-body text-[0.875rem] text-navy">{children}</dd>
    </div>
  )
}

const FACTS = 'grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-6 gap-y-4'

type FactorName =
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'vulnerability'
  | 'criticality'
  | 'exposure'
  | 'lifecycle'
  | 'exploitSignal'
  | 'informationClassification'

/** Why a factor has no value, shown in place of a 0 that would read as measured. */
interface Unscored {
  unscored: string
}

/** A factor as the backend gave it, with the share its bar fills; a percentage comes formatted. */
type FactorValue = { shown: number | string; share: number } | Unscored

const measured = (n: number): FactorValue => ({ shown: n, share: n })

/** Scoring Model 3 added the Exploit Signal and the Information Classification multiplier (ADR 0032). */
const FIRST_MODEL_WITH_CLASSIFICATION = 3

function ScoreDetails({ finding }: { finding: Finding }) {
  const { t } = useTranslation()
  const formatPercent = usePercentFormat()
  // The Score as it is now; the rank, like the order, is the snapshot's.
  const score = currentScoreDetails(finding)
  const notInModel: Unscored = { unscored: t('findings.detail.score.notInModel') }
  // From Model 3 on, the multiplier is null only while the Asset is Unclassified, which does not count.
  const unclassified: Unscored = { unscored: informationClassificationLabel(t, null) }
  const classification = score.information_classification_multiplier

  const vulnerability: (readonly [FactorName, FactorValue])[] = [
    ['alpha', measured(score.alpha)],
    ['beta', measured(score.beta)],
    ['gamma', measured(score.gamma)],
    [
      'exploitSignal',
      score.exploit_signal === null ? notInModel : { shown: formatPercent(score.exploit_signal), share: score.exploit_signal },
    ],
  ]
  const multipliers: (readonly [FactorName, FactorValue])[] = [
    ['criticality', measured(score.criticality_multiplier)],
    ['exposure', measured(score.exposure_multiplier)],
    ['lifecycle', measured(score.lifecycle_multiplier)],
    [
      'informationClassification',
      classification !== null
        ? measured(classification)
        : score.scoring_model < FIRST_MODEL_WITH_CLASSIFICATION
          ? notInModel
          : unclassified,
    ],
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        <Factors
          title={t('findings.detail.score.factors.vulnerability')}
          total={score.vulnerability}
          factors={vulnerability}
        />
        <Factors title={t('findings.detail.score.multipliers')} factors={multipliers} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`${META} text-gray`}>
          <span>{t(score.data_gaps.length === 0 ? 'findings.detail.score.measured' : 'findings.detail.score.estimated')}</span>{' '}
          <span>{t('findings.detail.score.model', { model: score.scoring_model })}</span>
        </p>
        {score.data_gaps.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {score.data_gaps.map((gap) => (
              <Badge key={gap} variant="muted">
                {t(`findings.detail.score.gap.${gap}`)}
              </Badge>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

function Factors({
  title,
  total,
  factors,
}: {
  title: string
  total?: number
  factors: readonly (readonly [FactorName, FactorValue])[]
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL}>{title}</span>
        {total !== undefined && <span className={`${MONO} font-semibold text-navy`}>{total}</span>}
      </div>
      <dl className="flex flex-col gap-2">
        {factors.map(([name, factor]) => (
          <div key={name} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-3">
            <dt className={`${META} text-gray`}>{t(`findings.detail.score.factors.${name}`)}</dt>
            {/* Reversed, so the value reads right after the label for assistive tech and the bar sits between them. */}
            <dd className="flex flex-row-reverse items-center gap-3">
              {'unscored' in factor ? (
                <span className={`${META} text-gray`}>{factor.unscored}</span>
              ) : (
                <>
                  <span className={`${MONO} min-w-10 text-right text-navy`}>{factor.shown}</span>
                  <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-border-row">
                    <span
                      className="block h-full rounded-full bg-navy/70"
                      style={{ width: `${Math.min(1, Math.max(0, factor.share)) * 100}%` }}
                    />
                  </span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Vulnerability({ details }: { details: FindingDetails }) {
  const { t } = useTranslation()
  const epssFormat = useEpssFormat()
  const { kev, epss } = details

  return (
    <div className="flex flex-col gap-5">
      {details.description ? <WrittenText text={details.description} /> : <p className={`${META} text-gray`}>{EMPTY}</p>}
      <dl className={FACTS}>
        <Fact label={t('findings.detail.vulnerability.kev')}>
          {kev ? (
            <span className="flex flex-col gap-0.5">
              <span>{t('findings.detail.vulnerability.kevListed', { date: kev.date_added, due: kev.due_date || EMPTY })}</span>
              <span className="text-gray">
                {t(`findings.detail.vulnerability.ransomware.${kev.known_ransomware_campaign_use === 'Known' ? 'Known' : 'Unknown'}`)}
              </span>
            </span>
          ) : (
            t('findings.detail.vulnerability.notInKev')
          )}
        </Fact>
        <Fact label={t('findings.detail.vulnerability.epss')}>
          {epss ? (
            <span className="flex flex-col gap-0.5">
              <span>{t('findings.detail.vulnerability.epssValue', { probability: epssFormat(epss.probability) })}</span>
              <span className="text-gray">
                {t('findings.detail.vulnerability.epssPercentile', {
                  share: epssFormat(epss.percentile),
                  date: epss.score_date,
                })}
              </span>
            </span>
          ) : (
            t('findings.detail.vulnerability.noEpss')
          )}
        </Fact>
        {details.cvss.map((m, i) => (
          <Fact key={i} label={t('findings.detail.vulnerability.cvss', { version: m.version, score: m.base_score })}>
            <span className="flex flex-col gap-0.5">
              <span className={`${MONO} truncate`} title={m.vector}>
                {m.vector || EMPTY}
              </span>
              <span className="text-gray">
                {t(`findings.detail.vulnerability.cvssSource.${m.type === 'Primary' ? 'Primary' : 'Secondary'}`)}
              </span>
            </span>
          </Fact>
        ))}
      </dl>
      {kev?.required_action && (
        <div className="flex flex-col gap-1 rounded-md bg-panel px-3.5 py-3">
          <span className={LABEL}>{t('findings.detail.vulnerability.kevAction')}</span>
          <p className={`${READING} text-[0.875rem]`}>{kev.required_action}</p>
        </div>
      )}
      {details.unavailable_feeds.length > 0 && (
        <p className={`${META} text-high`}>
          {t('findings.detail.vulnerability.unavailable', { feeds: details.unavailable_feeds.join(', ') })}
        </p>
      )}
    </div>
  )
}

function AssetDetails({ finding }: { finding: Finding }) {
  const { t } = useTranslation()
  const { component_role } = finding.details
  const asset = currentAsset(finding)

  return (
    <div className="flex flex-col gap-5">
      <dl className={FACTS}>
        <Fact label={t('findings.columns.asset')}>{asset.name}</Fact>
        <Fact label={t('findings.detail.asset.kind')}>{t(`config.inventory.kind.${asset.kind}`)}</Fact>
        <Fact label={t('findings.detail.asset.criticality')}>{t(`config.inventory.criticality.${asset.criticality}`)}</Fact>
        <Fact label={t('findings.detail.asset.exposure')}>{t(`config.inventory.exposure.${asset.exposure}`)}</Fact>
        <Fact label={t('findings.detail.asset.lifecycleStage')}>
          {t(`config.inventory.lifecycleStage.${asset.lifecycle_stage}`)}
        </Fact>
        <Fact label={t('findings.detail.asset.informationClassification')}>
          <InformationClassificationValue asset={asset} />
        </Fact>
        <Fact label={t('findings.detail.asset.component')}>
          <span className={MONO}>
            {finding.component} {finding.version}
          </span>
          {component_role && (
            <span className="block text-[0.75rem] text-gray">{t(`config.inventory.role.${component_role}`)}</span>
          )}
        </Fact>
      </dl>
      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t('findings.detail.asset.criticalServices')}</span>
        {asset.critical_services.length === 0 ? (
          <p className={`${META} text-gray`}>{t('findings.detail.asset.noCriticalServices')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {asset.critical_services.map((s) => (
              <li key={s.name} className="flex flex-col gap-0.5 rounded-md border border-border-panel px-3.5 py-2.5">
                <span className="font-body text-[0.875rem] font-semibold text-navy">{s.name}</span>
                <span className={`${META} text-gray`}>
                  {[
                    s.impact && t(`businessContext.vocab.impact.${s.impact}`),
                    s.max_downtime && t(`businessContext.vocab.downtime.${s.max_downtime}`),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {s.description && <p className={`${READING} text-[0.875rem]`}>{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Unclassified means no one declared it, not that the data is public: it shows as pending. */
function InformationClassificationValue({ asset }: { asset: FindingAsset }) {
  const { t } = useTranslation()
  const value = findingInformationClassification(asset)
  const label = informationClassificationLabel(t, value)
  if (value !== null) return label
  return (
    <Badge variant="muted" title={t('findings.detail.asset.unclassifiedHelp')}>
      {label}
    </Badge>
  )
}

const ROLE_ORDER: readonly Technique['role'][] = ['exploitation', 'primary_impact', 'secondary_impact']

function Threats({ details }: { details: FindingDetails }) {
  const { t } = useTranslation()
  const { labeling } = details
  // Read as an attack path: how they get in, then what they get, then what it leads to.
  const techniques = details.techniques.toSorted((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  return (
    <div className="flex flex-col gap-3">
      <p className={`${META} text-gray`}>
        {labeling.outcome === 'labeled'
          ? `${t('findings.detail.threats.inferred')} ${t('findings.detail.threats.labeling.labeled', { model: labeling.model })}.`
          : t(`findings.detail.threats.labeling.${labeling.outcome}`)}
      </p>
      {techniques.length > 0 && (
        <ol className="flex flex-col">
          {techniques.map((technique, i) => (
            <li
              key={technique.attack_id}
              className="grid gap-x-4 gap-y-2 border-t border-border-row py-4 first:border-t-0 first:pt-1 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
            >
              <span className="flex flex-col gap-0.5 pt-0.5">
                <span className="font-body text-[0.6875rem] font-semibold text-gray tabular-nums">
                  {t('findings.detail.threats.step', { position: i + 1 })}
                </span>
                <span className="font-body text-[0.8125rem] leading-tight font-semibold text-navy">
                  {t(`findings.detail.threats.stage.${technique.role}`)}
                </span>
              </span>
              <TechniqueItem technique={technique} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** One Technique: what it is and why the Cartógrafo thinks so, with its quote and mitigations on demand. */
function TechniqueItem({ technique }: { technique: Technique }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const mitigations = technique.mitigations.length

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${MONO} font-semibold text-navy`}>{technique.attack_id}</span>
        <span className="font-body text-[0.9375rem] font-semibold text-navy">{technique.name}</span>
        {technique.tactics.map((tactic) => (
          <Badge key={tactic} variant="muted">
            {tactic}
          </Badge>
        ))}
      </div>
      {technique.labeled_as && (
        <p className="font-body text-[0.75rem] text-gray">{t('findings.detail.threats.labeledAs', { id: technique.labeled_as })}</p>
      )}
      <p className={`${READING} text-[0.9375rem]`}>{technique.rationale}</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex cursor-pointer items-center gap-1 self-start rounded-sm font-body text-[0.8125rem] font-semibold text-nav-active-bg hover:underline"
      >
        <ChevronRightIcon
          className={`shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
        />
        {mitigations > 0
          ? t('findings.detail.threats.showMore', { count: mitigations })
          : t('findings.detail.threats.showQuote')}
      </button>
      {open && (
        <div className="flex animate-fade-in flex-col gap-3 border-l-2 border-border-panel pl-3">
          <blockquote className={`${READING} text-[0.875rem] text-gray italic`}>
            <span className="sr-only">{t('findings.detail.threats.quote')}: </span>“{technique.evidence}”
          </blockquote>
          {mitigations > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>{t('findings.detail.threats.mitigations')}</span>
              <ul className="flex flex-col gap-1.5">
                {technique.mitigations.map((m) => (
                  <li key={m.attack_id} className="flex flex-col font-body text-[0.875rem] text-navy">
                    <span>
                      <span className={`${MONO} font-semibold`}>{m.attack_id}</span> {m.name}
                    </span>
                    {m.advice && <span className={`${META} text-gray`}>{m.advice}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Advisories({ details }: { details: FindingDetails }) {
  const { t } = useTranslation()
  if (details.advisories.length === 0) return <p className={`${META} text-gray`}>{t('findings.detail.advisories.none')}</p>
  return (
    <ul className="flex flex-col gap-5">
      {details.advisories.map((a, i) => (
        <li key={i} className="flex flex-col gap-1.5">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-body text-[0.9375rem] font-semibold text-navy">{a.title}</span>
            <span className={`${META} text-gray`}>
              {a.feed} · {a.published}
            </span>
          </span>
          <ClampedText text={a.description} />
        </li>
      ))}
    </ul>
  )
}
