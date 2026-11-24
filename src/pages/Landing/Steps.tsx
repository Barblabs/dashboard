import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { ScoreBandBadge } from '../Findings/ScoreBandBadge'
import { Section } from './Section'

const ENTER = 'motion-safe:animate-rise-in motion-reduce:animate-fade-in'

const STEP_DELAYS = ['motion-safe:[animation-delay:0ms]', 'motion-safe:[animation-delay:80ms]', 'motion-safe:[animation-delay:160ms]', 'motion-safe:[animation-delay:240ms]']

function useRevealOnView<T extends Element>() {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (revealed || !element) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setRevealed(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -15% 0px', threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [revealed])

  return { ref, revealed }
}

export function Steps() {
  const { t } = useTranslation()
  const { ref, revealed } = useRevealOnView<HTMLOListElement>()

  return (
    <Section id="steps">
      <ol ref={ref} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Step index={0} revealed={revealed} title={t('landing.steps.sync.title')} text={t('landing.steps.sync.text')}>
          <SyncRunCard />
        </Step>
        <Step index={1} revealed={revealed} title={t('landing.steps.match.title')} text={t('landing.steps.match.text')}>
          <MatchCard />
        </Step>
        <Step index={2} revealed={revealed} title={t('landing.steps.score.title')} text={t('landing.steps.score.text')}>
          <ScoreCard revealed={revealed} />
        </Step>
        <Step index={3} revealed={revealed} title={t('landing.steps.alert.title')} text={t('landing.steps.alert.text')}>
          <AlertCard />
        </Step>
      </ol>
    </Section>
  )
}

function Step({ index, revealed, title, text, children }: { index: number; revealed: boolean; title: string; text: string; children: ReactNode }) {
  return (
    <li className={`flex flex-col overflow-hidden rounded-xl border border-border-panel bg-white ${revealed ? `${ENTER} ${STEP_DELAYS[index]}` : 'opacity-0'}`}>
      <div aria-hidden="true" className="flex h-52 flex-col justify-center border-b border-border-panel bg-panel px-5">
        {children}
      </div>
      <div className="flex flex-col gap-1.5 p-5">
        <h3 className="font-title text-[1.125rem] leading-tight text-navy">{title}</h3>
        <p className="font-body text-[0.9375rem] leading-[1.5] text-gray">{text}</p>
      </div>
    </li>
  )
}

const MINI_CARD = 'rounded-lg border border-border-panel bg-white p-3.5'

function SyncRunCard() {
  const { t } = useTranslation()
  const counts = [
    ['created', 12],
    ['updated', 214],
    ['deactivated', 3],
  ] as const

  return (
    <div className={MINI_CARD}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.75rem] font-medium text-navy">CMDB</span>
        <Badge variant="outline">{t('landing.steps.sync.succeeded')}</Badge>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {counts.map(([key, count]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <dt className="font-body text-[0.6875rem] font-semibold text-gray">{t(`landing.steps.sync.${key}`)}</dt>
            <dd className="font-mono text-[1.125rem] font-medium text-navy">{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function MatchCard() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-start">
      <Chip label={t('findings.columns.asset')} value="web-01" />
      <span className="ml-5 h-3 w-px bg-muted-bg" />
      <Chip label={t('findings.columns.component')} value="Apache httpd 2.4.49" />
      <span className="ml-5 h-3 w-px bg-muted-bg" />
      <div className={`${MINI_CARD} flex items-center gap-2 py-2.5`}>
        <span className="font-mono text-[0.8125rem] font-semibold text-navy">CVE-2021-41773</span>
        <Badge variant="critical">{t('findings.badges.kev')}</Badge>
      </div>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${MINI_CARD} flex max-w-full flex-wrap items-baseline gap-x-2 py-2`}>
      <span className="font-body text-[0.6875rem] font-semibold text-gray">{label}</span>
      <span className="font-mono text-[0.8125rem] whitespace-nowrap text-navy">{value}</span>
    </div>
  )
}

function ScoreCard({ revealed }: { revealed: boolean }) {
  const { t } = useTranslation()
  const inputs = [
    [t('landing.steps.score.exploited'), t('landing.steps.score.yes')],
    [t('findings.detail.asset.exposure'), t('config.inventory.exposure.internet_facing')],
  ] as const

  return (
    <div className={MINI_CARD}>
      <dl className="flex flex-col gap-1">
        {inputs.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 font-body text-[0.75rem]">
            <dt className="text-gray">{label}</dt>
            <dd className="text-right font-mono text-navy">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-2 border-t border-border-row pt-3">
        <span className="font-mono text-[1.125rem] font-medium text-navy">98</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border-row">
          <div className={`h-full w-[98%] origin-left rounded-full bg-critical ${revealed ? 'motion-safe:animate-fill-in motion-safe:[animation-delay:360ms]' : ''}`} />
        </div>
        <ScoreBandBadge band="critical" />
      </div>
    </div>
  )
}

function AlertCard() {
  const { t } = useTranslation()

  return (
    <div className={`${MINI_CARD} flex gap-3`}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-navy">
        <img src="/castle-logo.svg" alt="" className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5 font-body text-[0.8125rem]">
          <span className="font-semibold text-navy">barbattack</span>
          <span className="rounded-xs border border-border-panel px-1 font-mono text-[0.5625rem] text-gray">APP</span>
          <span className="text-[0.6875rem] text-gray">9:41</span>
        </p>
        <p className="mt-1.5 flex items-baseline gap-1.5 font-body text-[0.75rem] font-semibold text-navy">
          <span className="size-2 shrink-0 translate-y-px rounded-full bg-critical" />
          <span className="flex flex-wrap gap-x-1"><span>CRITICAL ·</span><span className="whitespace-nowrap">CVE-2021-41773</span></span>
        </p>
        <p className="mt-1 font-body text-[0.75rem] text-gray">
          {t('landing.steps.alert.owner')} <span className="whitespace-nowrap">· web-01</span>
        </p>
        <p className="mt-2 font-body text-[0.75rem] font-medium text-teal">{t('landing.steps.alert.open')}</p>
      </div>
    </div>
  )
}
