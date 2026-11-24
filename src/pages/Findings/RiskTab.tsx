import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  useAssetFindingsSummaryQuery,
  useBreakdownQuery,
  useFindingsTopQuery,
} from '../../api/findingsRisk'
import type {
  AssetFindingBands,
  BreakdownBy,
  BreakdownGroup,
  ComponentCount,
  CveCount,
} from '../../api/findingsRisk'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { CARD_EDGE, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { QueryBoundary } from '../../components/QueryBoundary'
import { BandLegend } from './BandLegend'
import { BAND_COLORS, BANDS, type Band } from './bands'
import { Message } from '../../components/ui/Message'

// ── constants ─────────────────────────────────────────────────────────────────


// ── helpers ───────────────────────────────────────────────────────────────────

function cellBg(level: number): string | undefined {
  if (level === 0) return undefined
  return `color-mix(in srgb, var(--color-navy) ${level * 20}%, white)`
}

function cellText(level: number) {
  return level >= 3 ? 'text-white' : level === 0 ? 'text-gray' : 'text-navy'
}

/** "Unknown" takes room only when some Findings sit on an Asset not yet classified. */
function withoutEmptyUnknown(groups: BreakdownGroup[]): BreakdownGroup[] {
  return groups.filter((g) => g.value !== 'unknown' || BANDS.some((b) => g[b] > 0))
}

// ── public component ──────────────────────────────────────────────────────────

export function RiskTabContent() {
  const [by, setBy] = useState<BreakdownBy>('exposure')

  return (
    <div className="flex flex-col gap-6">
      <ChartErrorBoundary><HeatmapCard by={by} onByChange={setBy} /></ChartErrorBoundary>
      <ChartErrorBoundary><AssetBarsCard /></ChartErrorBoundary>
      <ChartErrorBoundary><TopTablesCard /></ChartErrorBoundary>
    </div>
  )
}

// ── heat map ──────────────────────────────────────────────────────────────────

function HeatmapCard({ by, onByChange }: { by: BreakdownBy; onByChange: (b: BreakdownBy) => void }) {
  const { t } = useTranslation()
  const query = useBreakdownQuery(by)

  return (
    <Card>
      <CardHeader
        title={t('findings.risk.heatmapTitle')}
        actions={
          <div className="flex items-center gap-2 font-body text-[0.875rem]">
            <span className="text-gray">{t('findings.risk.byLabel')}</span>
            <div className="flex gap-1" role="group" aria-label={t('findings.risk.byLabel')}>
              {([
                { key: 'exposure', label: t('findings.risk.byExposure') },
                { key: 'criticality', label: t('findings.risk.byCriticality') },
                { key: 'area', label: t('findings.risk.byArea') },
              ] as const).map(({ key: opt, label }) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onByChange(opt)}
                  aria-pressed={by === opt}
                  className={`focus-ring rounded-md px-3 py-1 font-body text-[0.8125rem] transition-colors ${
                    by === opt
                      ? 'bg-navy text-white'
                      : 'border border-border-panel text-gray hover:border-navy hover:text-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />
      <div className="p-6">
        <QueryBoundary
          query={query}
          keys={{ loading: 'findings.risk.loading', failed: 'findings.risk.failed', network: 'findings.risk.network' }}
        >
          {(data) =>
            data.groups.length === 0 ? (
              <Message>{t('findings.risk.empty')}</Message>
            ) : (
              <HeatmapGrid groups={data.groups} by={by} />
            )
          }
        </QueryBoundary>
      </div>
    </Card>
  )
}

function HeatmapGrid({ groups: rawGroups, by }: { groups: BreakdownGroup[]; by: BreakdownBy }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const groups = withoutEmptyUnknown(rawGroups)

  const activeBands = BANDS.filter((b) => groups.some((g) => g[b] > 0))

  const maxCount = Math.max(...groups.flatMap((g) => BANDS.map((b) => g[b])))

  const heatLevel = (count: number) => {
    if (count === 0 || maxCount === 0) return 0
    return Math.min(4, Math.ceil((count / maxCount) * 4))
  }

  const knownGroupLabels: Record<string, string> = {
    internet_facing: t('findings.risk.groupLabel.internet_facing'),
    internal: t('findings.risk.groupLabel.internal'),
    unknown: t('findings.risk.groupLabel.unknown'),
    high: t('findings.risk.groupLabel.high'),
    medium: t('findings.risk.groupLabel.medium'),
    low: t('findings.risk.groupLabel.low'),
    none: t('findings.risk.groupLabel.none'),
  }

  const groupLabel = (g: BreakdownGroup): string => {
    if (by === 'area') return g.name ?? knownGroupLabels['none']
    return knownGroupLabels[g.value] ?? g.value
  }

  const openCell = (band: Band, g: BreakdownGroup) => {
    const next = new URLSearchParams()
    next.set('from', 'chart')
    next.set('band', band)
    if (by === 'exposure') next.set('exposure', g.value)
    else if (by === 'criticality') next.set('criticality', g.value)
    else if (by === 'area') next.set('area', g.value === 'none' ? 'none' : (g.name ?? g.value))
    void navigate(`/findings?${next}`)
  }

  const bandLabels: Record<Band, string> = {
    critical: t('findings.filter.bandValues.critical'),
    high: t('findings.filter.bandValues.high'),
    medium: t('findings.filter.bandValues.medium'),
    low: t('findings.filter.bandValues.low'),
    unbanded: t('findings.filter.bandValues.unbanded'),
  }
  const bandLabel = (b: Band) => bandLabels[b]

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr>
              <th className="pb-3 pr-4 text-left text-[0.75rem] font-normal text-gray">
                {t('findings.filter.band')}
              </th>
              {groups.map((g) => (
                <th key={g.value} className="pb-3 px-2 text-center text-[0.75rem] font-semibold text-navy">
                  {groupLabel(g)}
                </th>
              ))}
              <th className="pb-3 px-2 text-center text-[0.75rem] font-semibold text-navy">
                {t('findings.risk.totalCol')}
              </th>
            </tr>
          </thead>
          <tbody>
            {activeBands.map((band) => {
              const rowTotal = groups.reduce((s, g) => s + g[band], 0)
              return (
                <tr key={band}>
                  <td className="py-1 pr-4">
                    <span className="flex items-center gap-1.5 font-body text-[0.75rem] font-semibold text-navy">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: BAND_COLORS[band] }}
                      />
                      {bandLabel(band)}
                    </span>
                  </td>
                  {groups.map((g) => {
                    const count = g[band]
                    const level = heatLevel(count)
                    const clickable = count > 0
                    const isHighlighted = band === 'critical' && g.value === 'internet_facing'
                    return (
                      <td key={g.value} className="px-2 py-1 text-center">
                        <div
                          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg font-body ${count > 0 ? 'font-semibold' : ''} ${cellText(level)} ${clickable ? 'cursor-pointer' : ''}`}
                          style={{
                            backgroundColor: cellBg(level),
                            boxShadow: isHighlighted ? '0 0 0 2px #D7263D' : undefined,
                          }}
                          role={clickable ? 'button' : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          aria-label={t('findings.risk.cellLabel', { count, band: bandLabel(band), group: groupLabel(g) })}
                          title={clickable ? t('findings.risk.cellClickable') : undefined}
                          onClick={clickable ? () => openCell(band, g) : undefined}
                          onKeyDown={
                            clickable
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    openCell(band, g)
                                  }
                                }
                              : undefined
                          }
                        >
                          {count === 0 ? '–' : count}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-2 py-1 text-center">
                    <span className="font-semibold tabular-nums text-navy">{rowTotal}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {groups.some((g) => g.value === 'unknown') && (
        <p className="font-body text-[0.75rem] text-gray">{t('findings.risk.heatmapNote')}</p>
      )}
    </div>
  )
}

// ── asset bars ────────────────────────────────────────────────────────────────

function AssetBarsCard() {
  const { t } = useTranslation()
  const query = useAssetFindingsSummaryQuery()

  return (
    <Card>
      <CardHeader title={t('findings.risk.assetTitle')} />
      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.risk.loading', failed: 'findings.risk.failed', network: 'findings.risk.network' }}
      >
        {(data) =>
          data.assets.length === 0 ? (
            <p className="p-6 font-body text-[0.875rem] text-gray">{t('findings.risk.assetEmpty')}</p>
          ) : (
            <AssetBars assets={data.assets} />
          )
        }
      </QueryBoundary>
    </Card>
  )
}

function AssetBars({ assets }: { assets: AssetFindingBands[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const sorted = assets.toSorted(
    (a, b) =>
      b.critical - a.critical ||
      b.high - a.high ||
      b.medium - a.medium ||
      b.low - a.low ||
      b.unbanded - a.unbanded,
  )

  const data = sorted.map((a) => ({
    name: a.name,
    critical: a.critical,
    high: a.high,
    medium: a.medium,
    low: a.low,
    unbanded: a.unbanded,
    total: a.critical + a.high + a.medium + a.low + a.unbanded,
  }))

  const maxTotal = Math.max(...data.map((d) => d.total))

  const openAsset = (name: string) => {
    void navigate(`/findings?from=chart&asset=${encodeURIComponent(name)}`)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <BandLegend bands={BANDS.filter((b) => data.some((row) => row[b] > 0))} />
      <ul className="flex flex-col gap-3">
        {data.map((row) => (
          <li
            key={row.name}
            className="flex cursor-pointer items-center gap-3 font-body text-[0.875rem]"
            role="button"
            tabIndex={0}
            aria-label={t('findings.risk.assetBarLabel', { name: row.name, total: row.total })}
            onClick={() => openAsset(row.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openAsset(row.name)
              }
            }}
          >
            <span className="w-32 shrink-0 truncate text-right text-navy">{row.name}</span>
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-panel" style={{ maxWidth: `${(row.total / maxTotal) * 100}%` }}>
              {BANDS.filter((b) => row[b] > 0).reduce<{ segments: { band: Band; left: number; pct: number }[]; offset: number }>(
                ({ segments, offset }, band) => {
                  const pct = (row[band] / row.total) * 100
                  return { segments: [...segments, { band, left: offset, pct }], offset: offset + pct }
                },
                { segments: [], offset: 0 },
              ).segments.map(({ band, left, pct }) => (
                <div
                  key={band}
                  className="absolute inset-y-0"
                  style={{ left: `${left}%`, width: `${pct}%`, backgroundColor: BAND_COLORS[band] }}
                />
              ))}
            </div>
            <span className="w-8 shrink-0 tabular-nums text-right font-semibold text-navy">{row.total}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── top tables ────────────────────────────────────────────────────────────────

function TopTablesCard() {
  const { t } = useTranslation()
  const query = useFindingsTopQuery()

  return (
    <Card>
      <CardHeader title={t('findings.risk.topTitle')} />
      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.risk.loading', failed: 'findings.risk.failed', network: 'findings.risk.network' }}
      >
        {(data) => (
          <div className="grid grid-cols-1 divide-y divide-border-panel lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <ComponentsTable components={data.components} />
            <CvesTable cves={data.cves} />
          </div>
        )}
      </QueryBoundary>
    </Card>
  )
}

function ComponentsTable({ components }: { components: ComponentCount[] }) {
  const { t } = useTranslation()

  if (components.length === 0) {
    return <p className="p-6 font-body text-[0.875rem] text-gray">{t('findings.risk.topEmpty')}</p>
  }

  const maxFindings = Math.max(...components.map((c) => c.findings))

  return (
    <div>
      <p className="border-b border-border-panel px-6 py-3 font-title text-[0.875rem] text-navy">
        {t('findings.risk.topComponentsTitle')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr className={HEADER_ROW}>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.risk.topComponent')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.risk.topVersion')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('findings.risk.topFindings')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('findings.risk.topAssets')}</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={`${c.vendor}:${c.product}:${c.version}`} className="h-10 border-t border-border-row hover:bg-panel">
                <td className={`px-4 py-2 text-navy ${CARD_EDGE}`}>
                  <span className="font-semibold">{c.product}</span>
                  <span className="ml-1 text-[0.75rem] text-gray">{c.vendor}</span>
                </td>
                <td className={`px-4 py-2 font-mono text-[0.8125rem] text-gray ${CARD_EDGE}`}>{c.version}</td>
                <td className={`px-4 py-2 text-right ${CARD_EDGE}`}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-panel">
                      <div
                        className="h-full rounded-full bg-navy"
                        style={{ width: `${(c.findings / maxFindings) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 tabular-nums font-semibold text-navy">{c.findings}</span>
                  </div>
                </td>
                <td className={`px-4 py-2 tabular-nums text-right text-gray ${CARD_EDGE}`}>{c.assets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CvesTable({ cves }: { cves: CveCount[] }) {
  const { t } = useTranslation()

  if (cves.length === 0) {
    return <p className="p-6 font-body text-[0.875rem] text-gray">{t('findings.risk.topEmpty')}</p>
  }

  return (
    <div>
      <p className="border-b border-border-panel px-6 py-3 font-title text-[0.875rem] text-navy">
        {t('findings.risk.topCvesTitle')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr className={HEADER_ROW}>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.risk.topCve')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.risk.topKev')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.risk.topEpss')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('findings.risk.topFindings')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('findings.risk.topAssets')}</th>
            </tr>
          </thead>
          <tbody>
            {cves.map((c) => (
              <tr key={c.cve_id} className="h-10 border-t border-border-row hover:bg-panel">
                <td className={`px-4 py-2 font-mono text-[0.8125rem] font-semibold whitespace-nowrap text-navy ${CARD_EDGE}`}>{c.cve_id}</td>
                <td className={`px-4 py-2 ${CARD_EDGE}`}>
                  {c.kev ? (
                    <Badge variant="critical">{t('findings.risk.topKevYes')}</Badge>
                  ) : (
                    <span className="text-gray">{t('findings.risk.topKevNo')}</span>
                  )}
                </td>
                <td className={`px-4 py-2 tabular-nums text-gray ${CARD_EDGE}`}>
                  {c.epss !== null ? `${(c.epss * 100).toFixed(1)}%` : '—'}
                </td>
                <td className={`px-4 py-2 tabular-nums text-right font-semibold text-navy ${CARD_EDGE}`}>{c.findings}</td>
                <td className={`px-4 py-2 tabular-nums text-right text-gray ${CARD_EDGE}`}>{c.assets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
