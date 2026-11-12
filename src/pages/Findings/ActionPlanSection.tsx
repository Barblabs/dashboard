import type { ReactNode } from 'react'
import type { ParseKeys, TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { errorCode } from '../../api/client'
import { useCreatePlanMutation, type ActionPlan, type CurrentOrder, type Finding } from '../../api/prioritizations'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { LABEL, MONO, WRITTEN } from './styles'

// Why Luna gave no plan. A Map, so a code like "constructor" cannot hit the prototype.
const PLAN_ERRORS = new Map<string, ParseKeys>([
  ['agent_refused', 'findings.detail.plan.refused'],
  ['agent_rejected', 'findings.detail.plan.rejected'],
  ['agent_unavailable', 'findings.detail.plan.unavailable'],
])

function planErrorText(error: Error | null, t: TFunction<'translation'>): string | null {
  const key = PLAN_ERRORS.get(errorCode(error) ?? '')
  return key ? t(key) : requestErrorText(error, t, { fallback: 'findings.detail.plan.failed' })
}

/** Luna's newest Action Plan of the Finding, from whichever Prioritization it was asked. */
export function ActionPlanSection({ order, finding }: { order: CurrentOrder; finding: Finding }) {
  const { t } = useTranslation()
  const plan = order.prioritization.plans.find((p) => p.finding_id === finding.finding_id)
  const create = useCreatePlanMutation(order.prioritization.id)
  const error = planErrorText(create.error, t)

  return (
    <div className="flex flex-col gap-4">
      {plan ? <PlanView plan={plan} /> : <p className="text-[0.875rem] text-gray">{t('findings.detail.plan.none')}</p>}
      {create.isPending && <Alert tone="info">{t('findings.detail.plan.generating')}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div>
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

function PlanView({ plan }: { plan: ActionPlan }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const { output } = plan

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.8125rem] text-gray">{t('findings.detail.plan.written', { date: formatDate(plan.created_at) })}</p>
      <Block label={t('findings.detail.plan.summary')}>
        <p className={WRITTEN}>{output.summary}</p>
      </Block>
      <Block label={t('findings.detail.plan.steps')}>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          {output.steps.map((step, i) => (
            <li key={i} className={WRITTEN}>
              {step}
            </li>
          ))}
        </ol>
      </Block>
      <Block label={t('findings.detail.plan.fixedVersion')}>
        {output.fixed_version ? (
          <span className={`${MONO} font-semibold text-navy`}>{output.fixed_version}</span>
        ) : (
          <p className="text-[0.875rem] text-gray">{t('findings.detail.plan.noFixedVersion')}</p>
        )}
      </Block>
      {output.mitigation && (
        <Block label={t('findings.detail.plan.mitigation')}>
          <p className={WRITTEN}>{output.mitigation}</p>
        </Block>
      )}
      {output.attack_mitigations.length > 0 && (
        <Block label={t('findings.detail.plan.attackMitigations')}>
          <ul className="flex flex-col gap-2">
            {output.attack_mitigations.map((m, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className={`${MONO} font-semibold text-navy`}>
                  {m.mitigation_id} · {m.technique_id}
                </span>
                <p className={WRITTEN}>{m.step}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}
      <Block label={t('findings.detail.plan.verification')}>
        <p className={WRITTEN}>{output.verification}</p>
      </Block>
      {output.sources.length > 0 && (
        <Block label={t('findings.detail.plan.sources')}>
          <ul className="flex flex-col gap-0.5">
            {output.sources.map((url) => (
              <li key={url} className={`${MONO} break-all text-gray`}>
                {url}
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  )
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  )
}
