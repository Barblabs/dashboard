import type { ReactNode } from 'react'
import type { ParseKeys, TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { errorCode } from '../../api/client'
import { useCreatePlanMutation, type ActionPlan, type CurrentOrder, type Finding } from '../../api/prioritizations'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { References } from './References'
import { LABEL, META, MONO, READING } from './styles'

// Why Luna gave no plan. A Map, so a code like "constructor" cannot hit the prototype.
const PLAN_ERRORS = new Map<string, ParseKeys>([
  ['agent_refused', 'findings.detail.plan.refused'],
  ['agent_rejected', 'findings.detail.plan.rejected'],
  ['agent_unavailable', 'findings.detail.plan.unavailable'],
])

function planErrorText(error: Error | null, t: TFunction): string | null {
  const key = PLAN_ERRORS.get(errorCode(error) ?? '')
  return key ? t(key) : requestErrorText(error, t, { fallback: 'findings.detail.plan.failed' })
}

/** Luna's newest Action Plan of the Finding, from whichever Prioritization it was asked. */
export function ActionPlanSection({ order, finding }: { order: CurrentOrder; finding: Finding }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const plan = order.prioritization.plans.find((p) => p.finding_id === finding.finding_id)
  const create = useCreatePlanMutation(order.prioritization.id)
  const error = planErrorText(create.error, t)

  return (
    <div className="flex flex-col gap-4">
      {plan ? <PlanView plan={plan} /> : <p className={`${META} text-gray`}>{t('findings.detail.plan.none')}</p>}
      {create.isPending && <Alert tone="info">{t('findings.detail.plan.generating')}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div
        className={`flex flex-wrap items-center gap-3 ${plan ? 'justify-between border-t border-border-row pt-3' : ''}`}
      >
        {plan && (
          <span className={`${META} text-gray`}>
            {t('findings.detail.plan.written', { date: formatDate(plan.created_at) })}
          </span>
        )}
        <Button
          variant={plan ? 'secondary' : 'primary'}
          size="sm"
          loading={create.isPending}
          onClick={() => create.mutate(finding.finding_id)}
        >
          {plan ? t('findings.detail.plan.regenerate') : t('findings.detail.plan.generate')}
        </Button>
      </div>
    </div>
  )
}

/** The plan as work to do: its steps first, then what fixes it, how to check, and what holds until then. */
function PlanView({ plan }: { plan: ActionPlan }) {
  const { t } = useTranslation()
  const { output } = plan

  return (
    <div className="flex flex-col gap-5">
      <p className={`${READING} text-[1rem] font-medium`}>{output.summary}</p>

      <ol aria-label={t('findings.detail.plan.steps')} className="flex flex-col">
        {output.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 border-b border-border-row py-2.5 last:border-b-0">
            <span
              aria-hidden="true"
              className="mt-px grid size-6 shrink-0 place-items-center rounded-full border border-navy/30 font-body text-[0.75rem] font-semibold text-navy tabular-nums"
            >
              {i + 1}
            </span>
            <span className={`${READING} text-[0.9375rem]`}>{step}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Callout label={t('findings.detail.plan.fixedVersion')}>
          {output.fixed_version ? (
            <span className="font-mono text-[1rem] font-semibold text-navy">{output.fixed_version}</span>
          ) : (
            <span className={`${META} text-gray`}>{t('findings.detail.plan.noFixedVersion')}</span>
          )}
        </Callout>
        <Callout label={t('findings.detail.plan.verification')}>
          <span className={`${READING} text-[0.875rem]`}>{output.verification}</span>
        </Callout>
        {output.mitigation && (
          <Callout label={t('findings.detail.plan.mitigation')} className="sm:col-span-2">
            <span className={`${READING} text-[0.875rem]`}>{output.mitigation}</span>
          </Callout>
        )}
      </div>

      {output.attack_mitigations.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={LABEL}>{t('findings.detail.plan.attackMitigations')}</span>
          <ul className="flex flex-col gap-2">
            {output.attack_mitigations.map((m, i) => (
              <li key={i} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className={`${MONO} shrink-0 text-[0.75rem] text-gray`}>
                  {m.mitigation_id} · {m.technique_id}
                </span>
                <span className={`${READING} text-[0.875rem]`}>{m.step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={LABEL}>{t('findings.detail.plan.sources')}</span>
          <References urls={output.sources} />
        </div>
      )}
    </div>
  )
}

function Callout({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-md bg-panel px-3.5 py-3 ${className}`}>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  )
}
