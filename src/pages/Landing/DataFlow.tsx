import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EYEBROW } from './layout'
import { Section } from './Section'

const SOURCES = ['iTop', 'NVD', 'EPSS', 'CISA KEV', 'MITRE ATT&CK'] as const

const COLUMNS = 'lg:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1.15fr)_4rem_minmax(0,1fr)_4rem_minmax(0,1fr)]'

const DELAYS = ['[animation-delay:0ms]', '[animation-delay:1000ms]', '[animation-delay:2000ms]']

export function DataFlow() {
  const { t } = useTranslation()

  return (
    <Section id="flow">
      <div aria-hidden="true" className={`mb-4 hidden lg:grid ${COLUMNS}`}>
        <p className={`${EYEBROW} text-teal`}>{t('landing.flow.sources')}</p>
        <p className={`${EYEBROW} col-start-5 text-teal`}>{t('landing.flow.agents')}</p>
        <p className={`${EYEBROW} col-start-7 text-teal`}>Slack</p>
      </div>
      <div className={`grid lg:items-start ${COLUMNS}`}>
        <Stage label={t('landing.flow.sources')}>
          <ul className="flex flex-wrap gap-2 lg:flex-col">
            {SOURCES.map((source) => (
              <li key={source} className="rounded-md border border-border-panel bg-white px-3 py-2 font-mono text-[0.8125rem] font-medium text-navy">
                {source}
              </li>
            ))}
            <li className="rounded-md border border-border-panel bg-white px-3 py-2 font-mono text-[0.8125rem] font-medium text-navy">
              {t('landing.flow.news')}
            </li>
          </ul>
        </Stage>

        <Connector delay={DELAYS[0]} />

        <div className="flex flex-col rounded-xl bg-navy p-6">
          <div className="flex items-center gap-3">
            <img src="/castle-logo.svg" alt="" className="size-10" aria-hidden="true" />
            <span className="font-title text-[1.25rem] text-white">barbattack</span>
          </div>
          <ol className="mt-5 flex flex-col gap-3">
            {(['match', 'finding', 'score'] as const).map((step) => (
              <li key={step} className="flex gap-3 font-body text-[0.9375rem] leading-[1.45] text-nav-text">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan" />
                {t(`landing.flow.core.${step}`)}
              </li>
            ))}
          </ol>
        </div>

        <Connector delay={DELAYS[1]} />

        <Stage label={t('landing.flow.agents')}>
          <div className="flex flex-col gap-2">
            <AgentCard name="Prioritizer" text={t('landing.flow.prioritizer')} />
            <AgentCard name="Luna" text={t('landing.flow.luna')} />
          </div>
        </Stage>

        <Connector delay={DELAYS[2]} />

        <Stage label="Slack">
          <div className="flex flex-col gap-2">
            <Recipient to={t('landing.flow.owner')} />
            <Recipient to={t('landing.flow.team')} />
          </div>
        </Stage>
      </div>
    </Section>
  )
}

function Stage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className={`${EYEBROW} text-teal lg:sr-only`}>{label}</p>
      {children}
    </div>
  )
}

function AgentCard({ name, text }: { name: string; text: string }) {
  return (
    <div className="rounded-xl border border-border-panel bg-white p-4">
      <p className="font-title text-[1rem] text-navy">{name}</p>
      <p className="mt-1 font-body text-[0.875rem] leading-[1.45] text-gray">{text}</p>
    </div>
  )
}

function Recipient({ to }: { to: string }) {
  return (
    <div className="rounded-xl border border-border-panel bg-white p-4">
      <p className="font-body text-[0.75rem] font-semibold text-gray">{to}</p>
      <p className="mt-1.5 flex items-center gap-2 font-body text-[0.8125rem] font-semibold text-navy">
        <span aria-hidden="true" className="size-2 shrink-0 self-start translate-y-1.5 rounded-full bg-critical" />
        CVE-2021-41773 · web-01
      </p>
    </div>
  )
}

function Connector({ delay }: { delay: string }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-12 w-px bg-muted-bg lg:mx-0 lg:mt-16 lg:h-px lg:w-full">
      <span
        className={`absolute -top-[3px] left-[-3px] size-[7px] rounded-full bg-teal opacity-0 motion-safe:animate-flow-y lg:motion-safe:animate-flow-x motion-reduce:hidden ${delay}`}
      />
    </div>
  )
}
