import { useId, useState, type ReactNode, type RefObject } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Dialog } from '@base-ui/react/dialog'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  currentAsset,
  currentScoreDetails,
  findingInformationClassification,
  useFindingHistoryQuery,
  type CurrentOrder,
  type Finding,
  type FindingAsset,
  type FindingDetails,
  type Technique,
} from '../../api/prioritizations'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ChevronDownIcon, ChevronRightIcon, CloseIcon } from '../../components/ui/icons'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { EMPTY, useDateFormat, useLocale, usePercentFormat } from '../../i18n/format'
import { informationClassificationLabel } from '../Config/assetText'
import { ActionPlanSection } from './ActionPlanSection'
import { CloseAction, CloseNote } from './CloseStatus'
import { FeedbackSection } from './FeedbackSection'
import { CloseFindingDialog, ReopenFindingDialog, type FindingRef } from './FindingCloseDialogs'
import { FindingHistory } from './FindingHistory'
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

type SectionId = 'plan' | 'history' | 'threats' | 'vulnerability' | 'asset' | 'score' | 'advisories' | 'references'

const SECTION_TITLES: Record<SectionId, ParseKeys> = {
  plan: 'findings.detail.sections.plan',
  history: 'findings.detail.sections.history',
  threats: 'findings.detail.sections.threats',
  vulnerability: 'findings.detail.sections.vulnerability',
  asset: 'findings.detail.sections.asset',
  score: 'findings.detail.sections.score',
  advisories: 'findings.detail.sections.advisories',
  references: 'findings.detail.vulnerability.references',
}

/**
 * Everything known of one Finding: why it has its place, what a User says about it, and what
 * to do about it. The facts that decide how urgent it is stay in a rail that never scrolls
 * away; the column reads the reason, then the decision, then the Action Plan, and keeps the
 * history of its place and the technical detail folded until they are asked for.
 */
export function FindingDetail({ order, finding, onClose, closeButton }: Props) {
  const { t } = useTranslation()
  const idPrefix = useId()
  const closeDialog = useDialogTarget<FindingRef>()
  const reopenDialog = useDialogTarget<FindingRef>()
  const group = order.prioritization.groups.find((g) => g.position === finding.group)
  const { details } = finding
  const plan = order.prioritization.plans.find((p) => p.finding_id === finding.finding_id)
  const planSources = new Set(plan?.output.sources)
  const references = details.references.filter((url) => !planSources.has(url))
  const historyCount = useFindingHistoryQuery(finding.finding_id).data?.length

  const folded: SectionId[] = [
    'threats',
    'vulnerability',
    'asset',
    'score',
    'history',
    'advisories',
    ...(references.length > 0 ? (['references'] as const) : []),
  ]
  const sectionId = (id: string) => `${idPrefix}-${id}`

  const counts: Partial<Record<SectionId, number>> = {
    history: historyCount,
    threats: details.techniques.length,
    advisories: details.advisories.length,
    references: references.length,
  }

  const groupEvidence = group?.evidence.filter((e) => e.finding_id === finding.finding_id) ?? []
  const contextEvidence = group?.context_evidence ?? []

  const content: Record<SectionId, ReactNode> = {
    plan: <ActionPlanSection order={order} finding={finding} />,
    // With no group to read first, the newest entry offers its reason too.
    history: <FindingHistory findingId={finding.finding_id} newestReasonShown={group !== undefined} />,
    threats: <Threats details={details} />,
    vulnerability: <Vulnerability details={details} planMitigation={plan?.output.mitigation} />,
    asset: <AssetDetails finding={finding} />,
    score: <ScoreDetails finding={finding} />,
    advisories: <Advisories details={details} />,
    references: <References urls={references} />,
  }

  // Narrow screens stack the rail over the column and scroll both together; from md up each scrolls on its own.
  return (
    <div className="h-full overflow-y-auto md:grid md:grid-cols-[17.5rem_minmax(0,1fr)] md:overflow-hidden">
      <aside className="flex flex-col gap-5 border-b border-border-panel bg-panel px-5 py-6 md:min-h-0 md:overflow-y-auto md:border-r md:border-b-0">
        <Rail order={order} finding={finding} />
      </aside>

      <div className="relative md:min-h-0 md:overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-end gap-3 bg-white/85 px-6 py-3 backdrop-blur-md md:px-8">
          {/* Closing the Finding stands apart from closing the dialog, so one is never taken for the other. */}
          <div className="flex shrink-0 items-center gap-3">
            <CloseAction finding={finding} onCloseFinding={closeDialog.show} onReopenFinding={reopenDialog.show} />
            <span aria-hidden="true" className="h-6 w-px bg-border-panel" />
            <Button ref={closeButton} variant="secondary" size="sm" aria-label={t('common.close')} onClick={onClose}>
              <CloseIcon size={12} />
            </Button>
          </div>
        </div>

        <article className="flex flex-col gap-8 px-6 pt-2 pb-16 md:px-8">
          {group && (
            <section aria-labelledby={sectionId('why-title')} className="flex flex-col gap-3.5">
              <h3 id={sectionId('why-title')} className={HEADING}>
                {t('findings.detail.sections.why')}
              </h3>
              {/* The values it cites stay marked in the text; the Score section warns of the data gaps. */}
              <WrittenText text={group.reason} marks={[...groupEvidence, ...contextEvidence].map((e) => e.value)} lead />
            </section>
          )}

          <FeedbackSection order={order} finding={finding} />

          <section aria-labelledby={sectionId('plan-title')} className="flex flex-col gap-3.5">
            <h3 id={sectionId('plan-title')} className={HEADING}>
              {t(SECTION_TITLES.plan)}
            </h3>
            {content.plan}
          </section>

          <div className="flex flex-col border-t border-border-row">
            {folded.map((id) => (
              <Collapsible.Root
                key={id}
                render={<section aria-labelledby={sectionId(`${id}-title`)} />}
                className="border-b border-border-row"
              >
                <h3 id={sectionId(`${id}-title`)}>
                  <Collapsible.Trigger className="focus-ring group flex w-full cursor-pointer items-center justify-between gap-3 rounded-md py-4 text-left">
                    <span className="flex items-baseline gap-2">
                      <span className={HEADING}>{t(SECTION_TITLES[id])}</span>
                      {(counts[id] ?? 0) > 0 && (
                        <span className="font-body text-[0.875rem] text-gray tabular-nums">{counts[id]}</span>
                      )}
                    </span>
                    <ChevronDownIcon
                      size={14}
                      className="shrink-0 text-gray transition-transform duration-200 ease-[ease] group-data-panel-open:-rotate-180"
                    />
                  </Collapsible.Trigger>
                </h3>
                <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden opacity-100 transition-[height,opacity] duration-200 ease-[ease] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none">
                  <div className="flex flex-col gap-3.5 pb-6">{content[id]}</div>
                </Collapsible.Panel>
              </Collapsible.Root>
            ))}
          </div>
        </article>
      </div>

      <CloseFindingDialog dialog={closeDialog} />
      <ReopenFindingDialog dialog={reopenDialog} />
    </div>
  )
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

/** The CVSS with the highest base score, which the rail shows and whose vector the detail spells out. */
function topCvss(details: FindingDetails): FindingDetails['cvss'][number] | undefined {
  return details.cvss.toSorted((a, b) => b.base_score - a.base_score)[0]
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
  const { kev, epss } = finding.details
  const asset = currentAsset(finding)
  const classification = findingInformationClassification(asset)
  const top = topCvss(finding.details)

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
    {
      label: t('findings.detail.asset.lifecycleStage'),
      value: t(`config.inventory.lifecycleStage.${asset.lifecycle_stage}`),
      tone: asset.lifecycle_stage === 'unknown' ? 'quiet' : asset.lifecycle_stage === 'production' ? 'warn' : 'plain',
    },
    {
      label: t('findings.detail.asset.informationClassification'),
      value: informationClassificationLabel(t, classification),
      tone:
        classification === null
          ? 'quiet'
          : classification === 'highly_confidential'
            ? 'alarm'
            : classification === 'confidential'
              ? 'warn'
              : 'plain',
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
              {s.note && <span className="block font-body text-[0.75rem] text-gray">{s.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className={`${META} text-gray`}>
        {t('findings.detail.placed', { date: formatDate(finding.placed_at) })}
        {finding.closed_at && ` · ${t('findings.detail.closedOn', { date: formatDate(finding.closed_at) })}`}
      </p>
      <CloseNote finding={finding} />
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
      {score.data_gaps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className={`${META} text-gray`}>{t('findings.detail.score.estimated')}</p>
          <span className="flex flex-wrap gap-1.5">
            {score.data_gaps.map((gap) => (
              <Badge key={gap} variant="muted">
                {t(`findings.detail.score.gap.${gap}`)}
              </Badge>
            ))}
          </span>
        </div>
      )}
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

function Vulnerability({ details, planMitigation }: { details: FindingDetails; planMitigation?: string | null }) {
  const { t } = useTranslation()
  const { kev } = details
  // The Action Plan often carries CISA's required action as its mitigation; then it reads there only.
  const requiredAction = kev?.required_action.trim()
  const showRequiredAction = !!requiredAction && requiredAction !== planMitigation?.trim()
  const cvss = topCvss(details)

  return (
    <div className="flex flex-col gap-5">
      {details.description ? <WrittenText text={details.description} /> : <p className={`${META} text-gray`}>{EMPTY}</p>}
      {cvss?.vector && (
        <div className="flex flex-col gap-1">
          <span className={LABEL}>{t('findings.detail.vulnerability.cvss', { version: cvss.version })}</span>
          <code className={`${MONO} text-[0.9375rem] break-all text-navy`}>{cvss.vector}</code>
        </div>
      )}
      {showRequiredAction && (
        <div className="flex flex-col gap-1 rounded-md bg-panel px-3.5 py-3">
          <span className={LABEL}>{t('findings.detail.vulnerability.kevAction')}</span>
          <p className={`${READING} text-[0.875rem]`}>{requiredAction}</p>
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
      {labeling.outcome !== 'labeled' && (
        <p className={`${META} text-gray`}>{t(`findings.detail.threats.labeling.${labeling.outcome}`)}</p>
      )}
      {techniques.length > 0 && (
        <ol className="flex flex-col">
          {techniques.map((technique, i) => (
            <li
              key={technique.attack_id}
              className="grid gap-x-4 gap-y-2 border-t border-border-row py-4 first:border-t-0 first:pt-1 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
            >
              <span className="flex flex-col gap-0.5 pt-0.5">
                <span className="font-body text-[0.75rem] font-semibold text-gray tabular-nums">
                  {t('findings.detail.threats.step', { position: i + 1 })}
                </span>
                <span className="font-body text-[0.875rem] leading-tight font-semibold text-navy">
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
        className="focus-ring flex cursor-pointer items-center gap-1 self-start rounded-sm font-body text-[0.875rem] font-semibold text-nav-active-bg hover:underline"
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
