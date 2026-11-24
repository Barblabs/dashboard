import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { ScoreBandBadge } from '../Findings/ScoreBandBadge'
import { MONO } from '../Findings/styles'
import { SAMPLE_FINDINGS, type SampleFinding } from './samples'
import { Section } from './Section'

const GROUPS = [
  { key: 'exposed', findings: SAMPLE_FINDINGS.slice(0, 2) },
  { key: 'bastion', findings: SAMPLE_FINDINGS.slice(2, 3) },
  { key: 'internal', findings: SAMPLE_FINDINGS.slice(3, 4) },
] as const

const PLAN_STEPS = ['upgrade', 'restart', 'review'] as const

export function Priorities() {
  const { t } = useTranslation()

  return (
    <Section id="priorities" lead={t('landing.priorities.lead')}>
      <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ol className="flex flex-col gap-3">
          {GROUPS.map(({ key, findings }, index) => (
            <li key={key} className="rounded-xl border border-border-panel bg-white px-5 pt-4 pb-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Badge variant="solid">{t('findings.group.position', { position: index + 1 })}</Badge>
                <span className="font-title text-[1rem] leading-tight text-navy">{t(`landing.priorities.groups.${key}.title`)}</span>
              </div>
              <p className="mt-2 font-body text-[0.8125rem] leading-[1.5] text-gray">{t(`landing.priorities.groups.${key}.reason`)}</p>
              <ul className="mt-2 flex flex-col">
                {findings.map((finding) => (
                  <FindingLine key={finding.cve} finding={finding} />
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="flex flex-col rounded-xl border border-border-panel bg-white">
          <div className="border-b border-border-panel p-5">
            <p className="font-title text-[1.25rem] leading-tight text-navy">{t('landing.priorities.plan.title')}</p>
            <p className={`${MONO} mt-1 text-gray`}>CVE-2021-41773 · web-01 · Apache httpd 2.4.49</p>
          </div>
          <div className="flex flex-1 flex-col gap-3.5 p-5">
            <PlanPart label={t('findings.detail.plan.steps')}>
              <ol className="flex flex-col gap-1.5">
                {PLAN_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-2.5 font-body text-[0.875rem] leading-[1.45] text-navy">
                    <span className="font-mono text-teal">{index + 1}</span>
                    {t(`landing.priorities.plan.steps.${step}`)}
                  </li>
                ))}
              </ol>
            </PlanPart>
            <PlanPart label={t('findings.detail.plan.fixedVersion')}>
              <p className={`${MONO} text-navy`}>2.4.51</p>
            </PlanPart>
            <PlanPart label={t('findings.detail.plan.mitigation')}>
              <p className="font-body text-[0.875rem] leading-[1.45] text-navy">{t('landing.priorities.plan.mitigation')}</p>
            </PlanPart>
            <PlanPart label={t('findings.detail.plan.verification')}>
              <p className="font-body text-[0.875rem] leading-[1.45] text-navy">{t('landing.priorities.plan.verification')}</p>
            </PlanPart>
          </div>
          <div className="flex items-center gap-3 rounded-b-xl border-t border-border-panel bg-panel px-5 py-3.5">
            <Badge variant="muted">{t('findings.badges.closed')}</Badge>
            <p className="font-body text-[0.8125rem] leading-[1.4] text-gray">{t('landing.priorities.closed')}</p>
          </div>
        </div>
      </div>
    </Section>
  )
}

function FindingLine({ finding }: { finding: SampleFinding }) {
  const { t } = useTranslation()

  return (
    <li className="flex items-center gap-3 border-t border-border-row py-2.5 text-[0.8125rem]">
      <span className={`${MONO} shrink-0 font-semibold text-navy sm:w-[8.5rem]`}>{finding.cve}</span>
      <span className="min-w-0 flex-1 truncate font-body text-navy">{finding.asset}</span>
      {finding.kev && (
        <Badge variant="critical" className="max-sm:hidden">
          {t('findings.badges.kev')}
        </Badge>
      )}
      <span className={`${MONO} text-navy`}>{finding.score}</span>
      <ScoreBandBadge band={finding.band} />
    </li>
  )
}

function PlanPart({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-body text-[0.75rem] font-semibold text-gray">{label}</p>
      {children}
    </div>
  )
}
