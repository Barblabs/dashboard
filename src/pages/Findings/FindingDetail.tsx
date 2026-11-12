import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useTranslation } from 'react-i18next'
import type { CurrentOrder, Finding, FindingDetails, Technique } from '../../api/prioritizations'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EMPTY, useDateFormat } from '../../i18n/format'
import { ActionPlanSection } from './ActionPlanSection'
import { FeedbackSection } from './FeedbackSection'
import { FindingBadges } from './GroupPanel'
import { LABEL, MONO, WRITTEN } from './styles'

interface Props {
  order: CurrentOrder
  finding: Finding
  onClose: () => void
}

/** Everything known of one Finding: why it has its place, what it is, and what to do about it. */
export function FindingDetail({ order, finding, onClose }: Props) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const group = order.prioritization.groups.find((g) => g.position === finding.group)
  const { details } = finding

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {group && (
            <span className={LABEL}>{t('findings.detail.why.group', { position: group.position, title: group.title })}</span>
          )}
          <Dialog.Title className="font-mono text-[1.5rem] leading-tight font-semibold text-navy">
            {finding.cve_id}
          </Dialog.Title>
          <p className="font-body text-[0.9375rem] text-navy">
            {finding.asset_name} · <span className={MONO}>{finding.component} {finding.version}</span>
          </p>
          <FindingBadges order={order} finding={finding} />
          <p className="font-body text-[0.8125rem] text-gray">
            {t('findings.detail.placed', { date: formatDate(finding.placed_at) })}
            {finding.closed_at && ` · ${t('findings.detail.closedOn', { date: formatDate(finding.closed_at) })}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('findings.detail.close')}
        </Button>
      </header>

      <p className="font-body text-[0.75rem] text-gray">{t('findings.detail.plainText')}</p>

      {group && (
        <Section title={t('findings.detail.sections.why')}>
          <p className={WRITTEN}>{group.reason}</p>
          <Evidence
            title={t('findings.detail.why.evidence')}
            items={group.evidence.filter((e) => e.finding_id === finding.finding_id)}
          />
          <Evidence title={t('findings.detail.why.contextEvidence')} items={group.context_evidence} />
        </Section>
      )}

      <Section title={t('findings.detail.sections.score')}>
        <ScoreDetails finding={finding} />
      </Section>

      <Section title={t('findings.detail.sections.vulnerability')}>
        <Vulnerability details={details} />
      </Section>

      <Section title={t('findings.detail.sections.asset')}>
        <AssetDetails finding={finding} />
      </Section>

      <Section title={t('findings.detail.sections.threats')}>
        <Threats details={details} />
      </Section>

      <Section title={t('findings.detail.sections.advisories')}>
        {details.advisories.length === 0 ? (
          <p className="text-[0.875rem] text-gray">{t('findings.detail.advisories.none')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {details.advisories.map((a, i) => (
              <li key={i} className="flex flex-col gap-1">
                <span className="font-body text-[0.875rem] font-semibold text-navy">{a.title}</span>
                <span className="text-[0.75rem] text-gray">
                  {a.feed} · {a.published}
                </span>
                <p className={WRITTEN}>{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('findings.detail.sections.plan')}>
        <ActionPlanSection order={order} finding={finding} />
      </Section>

      <Section title={t('findings.detail.sections.feedback')}>
        <FeedbackSection order={order} finding={finding} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border-row pt-5">
      <h3 className={LABEL}>{title}</h3>
      {children}
    </section>
  )
}

function Evidence({ title, items }: { title: string; items: { path: string; value: string }[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-body text-[0.8125rem] font-semibold text-navy">{title}</span>
      <ul className="flex flex-col gap-1">
        {items.map((e, i) => (
          <li key={i} className={`${MONO} break-all text-gray`}>
            {e.path} = <span className="text-navy">{e.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={LABEL}>{label}</dt>
      <dd className="font-body text-[0.875rem] text-navy">{children}</dd>
    </div>
  )
}

const FACTS = 'grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4'

function ScoreDetails({ finding }: { finding: Finding }) {
  const { t } = useTranslation()
  const score = finding.details.score_details
  const factors = [
    ['alpha', score.alpha],
    ['beta', score.beta],
    ['gamma', score.gamma],
    ['vulnerability', score.vulnerability],
    ['criticality', score.criticality_multiplier],
    ['exposure', score.exposure_multiplier],
  ] as const

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="font-title text-[1.75rem] leading-none text-navy">{score.value}</span>
        <span className="font-body text-[0.875rem] text-gray">
          {t('findings.detail.score.rank', { rank: finding.score_rank })}
        </span>
      </p>
      <dl className={FACTS}>
        {factors.map(([name, value]) => (
          <Fact key={name} label={t(`findings.detail.score.factors.${name}`)}>
            <span className={MONO}>{value}</span>
          </Fact>
        ))}
      </dl>
      {score.data_gaps.length === 0 ? (
        <p className="text-[0.8125rem] text-gray">{t('findings.detail.score.measured')}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.8125rem] text-gray">{t('findings.detail.score.estimated')}</p>
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

function Vulnerability({ details }: { details: FindingDetails }) {
  const { t } = useTranslation()
  const { kev, epss } = details

  return (
    <div className="flex flex-col gap-4">
      <p className={WRITTEN}>{details.description || EMPTY}</p>
      <dl className={FACTS}>
        <Fact label={t('findings.detail.vulnerability.kev')}>
          {kev ? (
            <span className="flex flex-col gap-1">
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
          {epss
            ? t('findings.detail.vulnerability.epssValue', {
                probability: epss.probability,
                percentile: epss.percentile,
                date: epss.score_date,
              })
            : t('findings.detail.vulnerability.noEpss')}
        </Fact>
        {details.cvss.map((m, i) => (
          <Fact key={i} label={t('findings.detail.vulnerability.cvss', { version: m.version, score: m.base_score })}>
            <span className="flex flex-col gap-1">
              <span className={`${MONO} break-all`}>{m.vector || EMPTY}</span>
              <span className="text-gray">
                {t(`findings.detail.vulnerability.cvssSource.${m.type === 'Primary' ? 'Primary' : 'Secondary'}`)}
              </span>
            </span>
          </Fact>
        ))}
      </dl>
      {kev?.required_action && (
        <div className="flex flex-col gap-1">
          <span className={LABEL}>{t('findings.detail.vulnerability.kevAction')}</span>
          <p className={WRITTEN}>{kev.required_action}</p>
        </div>
      )}
      {details.unavailable_feeds.length > 0 && (
        <p className="text-[0.8125rem] text-high">
          {t('findings.detail.vulnerability.unavailable', { feeds: details.unavailable_feeds.join(', ') })}
        </p>
      )}
      {details.references.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={LABEL}>{t('findings.detail.vulnerability.references')}</span>
          <ul className="flex flex-col gap-0.5">
            {details.references.map((url) => (
              <li key={url} className={`${MONO} break-all text-gray`}>
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AssetDetails({ finding }: { finding: Finding }) {
  const { t } = useTranslation()
  const { asset, component_role } = finding.details
  const exposure = asset.exposure === 'unknown' ? 'undeclared' : asset.exposure

  return (
    <div className="flex flex-col gap-4">
      <dl className={FACTS}>
        <Fact label={t('findings.columns.asset')}>{asset.name}</Fact>
        <Fact label={t('findings.detail.asset.kind')}>
          {t(`config.inventory.kind.${asset.kind}`)}
        </Fact>
        <Fact label={t('findings.detail.asset.criticality')}>{t(`config.inventory.criticality.${asset.criticality}`)}</Fact>
        <Fact label={t('findings.detail.asset.exposure')}>{t(`config.inventory.exposure.${exposure}`)}</Fact>
        <Fact label={t('findings.detail.asset.component')}>
          <span className={MONO}>
            {finding.component} {finding.version}
          </span>
          {component_role && (
            <span className="block text-[0.75rem] text-gray">
              {t(`config.inventory.role.${component_role}`)}
            </span>
          )}
        </Fact>
      </dl>
      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t('findings.detail.asset.criticalServices')}</span>
        {asset.critical_services.length === 0 ? (
          <p className="text-[0.875rem] text-gray">{t('findings.detail.asset.noCriticalServices')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {asset.critical_services.map((s) => (
              <li key={s.name} className="flex flex-col gap-0.5">
                <span className="font-body text-[0.875rem] font-semibold text-navy">{s.name}</span>
                <span className="text-[0.8125rem] text-gray">
                  {[
                    s.impact && t(`businessContext.vocab.impact.${s.impact}`),
                    s.max_downtime && t(`businessContext.vocab.downtime.${s.max_downtime}`),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {s.description && <p className={WRITTEN}>{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Threats({ details }: { details: FindingDetails }) {
  const { t } = useTranslation()
  const { labeling, techniques } = details

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.875rem] text-gray">
        {labeling.outcome === 'labeled'
          ? t('findings.detail.threats.labeling.labeled', { model: labeling.model })
          : t(`findings.detail.threats.labeling.${labeling.outcome}`)}
      </p>
      {techniques.length > 0 && (
        <>
          <p className="text-[0.8125rem] text-gray">{t('findings.detail.threats.inferred')}</p>
          <ul className="flex flex-col gap-3">
            {techniques.map((technique) => (
              <TechniqueItem key={technique.attack_id} technique={technique} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function TechniqueItem({ technique }: { technique: Technique }) {
  const { t } = useTranslation()

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-panel bg-panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${MONO} font-semibold text-navy`}>{technique.attack_id}</span>
        <span className="font-body text-[0.875rem] font-semibold text-navy">{technique.name}</span>
        <Badge variant="caps">{t(`findings.detail.threats.role.${technique.role}`)}</Badge>
        {technique.tactics.map((tactic) => (
          <Badge key={tactic} variant="muted">
            {tactic}
          </Badge>
        ))}
      </div>
      {technique.labeled_as && (
        <p className="text-[0.75rem] text-gray">{t('findings.detail.threats.labeledAs', { id: technique.labeled_as })}</p>
      )}
      <blockquote className={`${WRITTEN} border-l-2 border-muted-bg pl-3 italic`}>
        <span className="sr-only">{t('findings.detail.threats.quote')}: </span>
        {technique.evidence}
      </blockquote>
      <p className={WRITTEN}>{technique.rationale}</p>
      {technique.mitigations.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={LABEL}>{t('findings.detail.threats.mitigations')}</span>
          <ul className="flex flex-col gap-1.5">
            {technique.mitigations.map((m) => (
              <li key={m.attack_id} className="text-[0.875rem]">
                <span className={`${MONO} font-semibold`}>{m.attack_id}</span> {m.name}
                {m.advice && <p className={`${WRITTEN} text-gray`}>{m.advice}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
