import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { Section } from './Section'

const RELEVANCE = ['named', 'finding', 'footprint', 'peer'] as const

export function Agents() {
  const { t } = useTranslation()

  return (
    <Section id="agents" lead={t('landing.agents.lead')}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AgentCard name="Prioritizer" text={t('landing.agents.prioritizer')} className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((position) => (
              <Badge key={position} variant={position === 1 ? 'solid' : 'quiet'}>
                {t('findings.group.position', { position })}
              </Badge>
            ))}
          </div>
        </AgentCard>
        <AgentCard name="Luna" text={t('landing.agents.luna')}>
          <p className="flex gap-2.5 font-body text-[0.8125rem] text-navy">
            <span className="font-mono text-teal">1</span>
            {t('landing.priorities.plan.steps.upgrade')}
          </p>
        </AgentCard>
        <AgentCard name="Editor" text={t('landing.agents.editor')}>
          <div className="flex flex-wrap gap-1.5">
            {RELEVANCE.map((relevance) => (
              <Badge key={relevance} variant="outline">
                {t(`news.relevance.${relevance}.short`)}
              </Badge>
            ))}
          </div>
        </AgentCard>
        <AgentCard name="Drafter" text={t('landing.agents.drafter')} className="lg:col-span-2">
          <p className="font-body text-[0.8125rem] text-gray">{t('landing.agents.drafterSample')}</p>
        </AgentCard>
      </div>
    </Section>
  )
}

function AgentCard({ name, text, className = '', children }: { name: string; text: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 rounded-xl border border-border-panel bg-white p-5 ${className}`}>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-title text-[1.25rem] leading-tight text-navy">{name}</h3>
        <p className="max-w-[48ch] font-body text-[0.9375rem] leading-[1.5] text-gray">{text}</p>
      </div>
      <div aria-hidden="true" className="mt-auto border-t border-border-row pt-4">
        {children}
      </div>
    </div>
  )
}
