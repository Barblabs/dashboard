import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useAttackMatrixQuery } from '../../api/attackMatrix'
import type { TacticCount, TechniqueCount } from '../../api/attackMatrix'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { QueryBoundary } from '../../components/QueryBoundary'

// ── constants ─────────────────────────────────────────────────────────────────

const BANDS = ['critical', 'high', 'medium', 'low', 'unbanded'] as const
type Band = (typeof BANDS)[number]

const BAND_COLORS: Record<Band, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  medium: 'var(--color-medium)',
  low: 'var(--color-low)',
  unbanded: 'var(--color-gray)',
}

const TACTIC_ORDER = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
] as const

// ── helpers ───────────────────────────────────────────────────────────────────

function cellBg(level: number): string | undefined {
  if (level === 0) return undefined
  return `color-mix(in srgb, var(--color-navy) ${level * 20}%, white)`
}

function cellText(level: number) {
  return level >= 3 ? 'text-white' : level === 0 ? 'text-gray' : 'text-navy'
}

function sortTactics(tactics: TacticCount[]): TacticCount[] {
  const index = new Map<string, number>(TACTIC_ORDER.map((t, i) => [t, i]))
  return tactics.toSorted((a, b) => (index.get(a.tactic) ?? 99) - (index.get(b.tactic) ?? 99))
}

// ── public component ──────────────────────────────────────────────────────────

export function ThreatsTabContent() {
  const [params, setParams] = useSearchParams()
  const role = params.get('role') ?? ''

  const setRole = (value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'threats')
      if (value) next.set('role', value)
      else next.delete('role')
      return next
    })

  const query = useAttackMatrixQuery(role)

  return (
    <div className="flex flex-col gap-6">
      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.threats.loading', failed: 'findings.threats.failed', network: 'findings.threats.network' }}
      >
        {(data) => (
          <>
            <ChartErrorBoundary>
              <CoverageCard labeled={data.coverage.labeled} open={data.coverage.open} />
            </ChartErrorBoundary>
            <ChartErrorBoundary>
              <HeatmapCard tactics={sortTactics(data.tactics)} role={role} onRoleChange={setRole} />
            </ChartErrorBoundary>
            <ChartErrorBoundary>
              <TopTechniquesCard techniques={data.techniques} />
            </ChartErrorBoundary>
          </>
        )}
      </QueryBoundary>
    </div>
  )
}

// ── coverage bar ──────────────────────────────────────────────────────────────

function CoverageCard({ labeled, open }: { labeled: number; open: number }) {
  const { t } = useTranslation()
  const pct = open > 0 ? Math.round((labeled / open) * 100) : 0

  return (
    <section className="rounded-xl border border-border-panel bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-title text-[1rem] text-navy">{t('findings.threats.coverageTitle')}</h2>
      </div>
      <p className="mb-3 font-body text-[0.875rem] text-navy">
        {t('findings.threats.coverageLabel', { labeled, open })}
      </p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-panel">
        <div
          className="h-full rounded-full bg-navy transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('findings.threats.coverageTitle')}
        />
      </div>
      <p className="mt-1 font-body text-[0.75rem] text-gray">{pct}%</p>
    </section>
  )
}

// ── heatmap ───────────────────────────────────────────────────────────────────

function HeatmapCard({
  tactics,
  role,
  onRoleChange,
}: {
  tactics: TacticCount[]
  role: string
  onRoleChange: (r: string) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="rounded-xl border border-border-panel bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-panel px-6 py-4">
        <h2 className="font-title text-[1rem] text-navy">{t('findings.threats.heatmapTitle')}</h2>
        <div className="flex flex-wrap items-center gap-2 font-body text-[0.875rem]">
          <span className="text-gray">{t('findings.threats.roleLabel')}</span>
          <div className="flex flex-wrap gap-1" role="group" aria-label={t('findings.threats.roleLabel')}>
            {([
              { key: '', label: t('findings.threats.roleAll') },
              { key: 'exploitation', label: t('findings.threats.roleExploitation') },
              { key: 'primary_impact', label: t('findings.threats.rolePrimaryImpact') },
              { key: 'secondary_impact', label: t('findings.threats.roleSecondaryImpact') },
            ] as const).map(({ key: opt, label }) => (
              <button
                key={opt}
                type="button"
                onClick={() => onRoleChange(opt)}
                aria-pressed={role === opt}
                className={`focus-ring rounded-md px-3 py-1 font-body text-[0.8125rem] transition-colors ${
                  role === opt
                    ? 'bg-navy text-white'
                    : 'border border-border-panel text-gray hover:border-navy hover:text-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-6">
        <HeatmapGrid tactics={tactics} />
        <p className="mt-4 font-body text-[0.75rem] text-gray">{t('findings.threats.heatmapNote')}</p>
      </div>
    </section>
  )
}

function HeatmapGrid({ tactics }: { tactics: TacticCount[] }) {
  const { t } = useTranslation()

  const activeBands = BANDS.filter((b) => tactics.some((tac) => tac[b] > 0))
  const maxCount = Math.max(...tactics.flatMap((tac) => BANDS.map((b) => tac[b])), 1)

  const heatLevel = (count: number) => {
    if (count === 0) return 0
    return Math.min(4, Math.ceil((count / maxCount) * 4))
  }

  const tacticLabels: Record<string, string> = {
    reconnaissance: t('findings.threats.tacticLabel.reconnaissance'),
    'resource-development': t('findings.threats.tacticLabel.resource-development'),
    'initial-access': t('findings.threats.tacticLabel.initial-access'),
    execution: t('findings.threats.tacticLabel.execution'),
    persistence: t('findings.threats.tacticLabel.persistence'),
    'privilege-escalation': t('findings.threats.tacticLabel.privilege-escalation'),
    'defense-evasion': t('findings.threats.tacticLabel.defense-evasion'),
    'credential-access': t('findings.threats.tacticLabel.credential-access'),
    discovery: t('findings.threats.tacticLabel.discovery'),
    'lateral-movement': t('findings.threats.tacticLabel.lateral-movement'),
    collection: t('findings.threats.tacticLabel.collection'),
    'command-and-control': t('findings.threats.tacticLabel.command-and-control'),
    exfiltration: t('findings.threats.tacticLabel.exfiltration'),
    impact: t('findings.threats.tacticLabel.impact'),
  }

  const bandLabels: Record<Band, string> = {
    critical: t('findings.filter.bandValues.critical'),
    high: t('findings.filter.bandValues.high'),
    medium: t('findings.filter.bandValues.medium'),
    low: t('findings.filter.bandValues.low'),
    unbanded: t('findings.filter.bandValues.unbanded'),
  }

  if (activeBands.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-body text-[0.875rem]">
        <thead>
          <tr>
            <th className="pb-3 pr-4 text-left text-[0.75rem] font-normal text-gray">
              {t('findings.columns.score')}
            </th>
            {tactics.map((tac) => (
              <th key={tac.tactic} className="pb-3 px-1 text-center text-[0.6875rem] font-semibold text-navy">
                {tacticLabels[tac.tactic] ?? tac.tactic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeBands.map((band) => (
            <tr key={band}>
              <td className="py-1 pr-4">
                <span className="flex items-center gap-1.5 font-body text-[0.75rem] font-semibold text-navy">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: BAND_COLORS[band] }}
                  />
                  {bandLabels[band]}
                </span>
              </td>
              {tactics.map((tac) => {
                const count = tac[band]
                const level = heatLevel(count)
                return (
                  <td key={tac.tactic} className="px-1 py-1 text-center">
                    <div
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md font-body text-[0.75rem] ${count > 0 ? 'font-semibold' : ''} ${cellText(level)}`}
                      style={{ backgroundColor: cellBg(level) }}
                      aria-label={t('findings.threats.cellLabel', {
                        count,
                        band: bandLabels[band],
                        tactic: tacticLabels[tac.tactic] ?? tac.tactic,
                      })}
                    >
                      {count === 0 ? '–' : count}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── top techniques ────────────────────────────────────────────────────────────

function TopTechniquesCard({ techniques }: { techniques: TechniqueCount[] }) {
  const { t } = useTranslation()

  return (
    <section className="rounded-xl border border-border-panel bg-white">
      <div className="border-b border-border-panel px-6 py-4">
        <h2 className="font-title text-[1rem] text-navy">{t('findings.threats.topTitle')}</h2>
      </div>
      {techniques.length === 0 ? (
        <p className="p-6 font-body text-[0.875rem] text-gray">{t('findings.threats.topEmpty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <TechniquesTable techniques={techniques} />
        </div>
      )}
    </section>
  )
}

function TechniquesTable({ techniques }: { techniques: TechniqueCount[] }) {
  const { t } = useTranslation()

  const roleLabels: Record<string, string> = {
    exploitation: t('findings.threats.roleValue.exploitation'),
    primary_impact: t('findings.threats.roleValue.primary_impact'),
    secondary_impact: t('findings.threats.roleValue.secondary_impact'),
  }

  const maxFindings = Math.max(...techniques.map((tc) => tc.findings), 1)

  return (
    <table className="w-full min-w-[40rem] border-collapse font-body text-[0.875rem]">
      <thead>
        <tr className="text-left text-[0.75rem] font-normal text-gray">
          <th className="px-4 py-2 font-normal">{t('findings.threats.topId')}</th>
          <th className="px-4 py-2 font-normal">{t('findings.threats.topName')}</th>
          <th className="px-4 py-2 font-normal">{t('findings.threats.topTactics')}</th>
          <th className="px-4 py-2 font-normal">{t('findings.threats.topRole')}</th>
          <th className="px-4 py-2 text-right font-normal">{t('findings.threats.topFindings')}</th>
        </tr>
      </thead>
      <tbody>
        {techniques.map((tc) => (
          <tr key={tc.attack_id} className="border-t border-border-panel hover:bg-panel">
            <td className="px-4 py-2 font-mono text-[0.8125rem] font-semibold text-navy">{tc.attack_id}</td>
            <td className="px-4 py-2 text-navy">{tc.name}</td>
            <td className="px-4 py-2 font-body text-[0.75rem] text-gray">{tc.tactics.join(', ')}</td>
            <td className="px-4 py-2">
              {tc.roles.map((r) => (
                <span
                  key={r}
                  className="mr-1 inline-block rounded bg-panel px-1.5 py-0.5 font-body text-[0.75rem] whitespace-nowrap text-navy"
                >
                  {roleLabels[r] ?? r}
                </span>
              ))}
            </td>
            <td className="px-4 py-2 text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full rounded-full bg-navy"
                    style={{ width: `${(tc.findings / maxFindings) * 100}%` }}
                  />
                </div>
                <span className="w-5 tabular-nums font-semibold text-navy">{tc.findings}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
