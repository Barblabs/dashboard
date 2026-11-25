import { useTranslation } from 'react-i18next'
import { useAttackMatrixQuery } from '../../api/attackMatrix'
import type { TacticCount, TechniqueCount } from '../../api/attackMatrix'
import { Card, CardHeader } from '../../components/ui/Card'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { CARD_EDGE, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { QueryBoundary } from '../../components/QueryBoundary'
import { BAND_COLORS, BANDS, type Band } from './bands'

// ── constants ─────────────────────────────────────────────────────────────────


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
  const query = useAttackMatrixQuery()

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
              <HeatmapCard tactics={sortTactics(data.tactics)} />
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
    <Card>
      <CardHeader title={t('findings.threats.coverageTitle')} help={t('findings.threats.coverageHelp')} />
      <div className="flex flex-col gap-3 p-6">
        <p className="font-body text-[0.875rem] text-navy">
          {t('findings.threats.coverageLabel', { labeled, open })}
        </p>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full bg-navy"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('findings.threats.coverageTitle')}
          />
        </div>
      </div>
    </Card>
  )
}

// ── heatmap ───────────────────────────────────────────────────────────────────

function HeatmapCard({ tactics }: { tactics: TacticCount[] }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader title={t('findings.threats.heatmapTitle')} help={t('findings.threats.heatmapHelp')} />
      <div className="p-6">
        <HeatmapGrid tactics={tactics} />
      </div>
    </Card>
  )
}

function HeatmapGrid({ tactics: all }: { tactics: TacticCount[] }) {
  const { t } = useTranslation()

  // Only the tactics some Finding leads to take a column; the rest are named in one line below.
  const tactics = all.filter((tac) => BANDS.some((b) => tac[b] > 0))
  const withFindings = new Set(tactics.map((tac) => tac.tactic))
  const empty = TACTIC_ORDER.filter((tactic) => !withFindings.has(tactic))

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
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr>
              <th className="pb-3 pr-4 text-left text-[0.75rem] font-normal text-gray">
                {t('findings.filter.band')}
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
      {empty.length > 0 && (
        <p className="font-body text-[0.875rem] text-gray">
          {t('findings.threats.emptyTactics', { tactics: empty.map((tactic) => tacticLabels[tactic]).join(', ') })}
        </p>
      )}
    </div>
  )
}

// ── top techniques ────────────────────────────────────────────────────────────

function TopTechniquesCard({ techniques }: { techniques: TechniqueCount[] }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader title={t('findings.threats.topTitle')} help={t('findings.threats.topHelp')} />
      {techniques.length === 0 ? (
        <p className="p-6 font-body text-[0.875rem] text-gray">{t('findings.threats.topEmpty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <TechniquesTable techniques={techniques} />
        </div>
      )}
    </Card>
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
        <tr className={HEADER_ROW}>
          <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.threats.topId')}</th>
          <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.threats.topName')}</th>
          <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.threats.topTactics')}</th>
          <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.threats.topRole')}</th>
          <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('findings.threats.topFindings')}</th>
        </tr>
      </thead>
      <tbody>
        {techniques.map((tc) => (
          <tr key={tc.attack_id} className="border-t border-border-row hover:bg-panel">
            <td className={`px-4 py-2 font-mono text-[0.8125rem] font-semibold text-navy ${CARD_EDGE}`}>{tc.attack_id}</td>
            <td className={`px-4 py-2 text-navy ${CARD_EDGE}`}>{tc.name}</td>
            <td className={`px-4 py-2 font-body text-[0.75rem] text-gray ${CARD_EDGE}`}>{tc.tactics.join(', ')}</td>
            <td className={`px-4 py-2 ${CARD_EDGE}`}>
              {tc.roles.map((r) => (
                <span
                  key={r}
                  className="mr-1 inline-block rounded bg-panel px-1.5 py-0.5 font-body text-[0.75rem] whitespace-nowrap text-navy"
                >
                  {roleLabels[r] ?? r}
                </span>
              ))}
            </td>
            <td className={`px-4 py-2 text-right ${CARD_EDGE}`}>
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
