import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useCurrentOrderQuery } from '../../api/prioritizations'
import type { PriorityGroup } from '../../api/prioritizations'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Message } from '../../components/ui/Message'
import { BAND_COLORS, BANDS, buildMatrix } from './beforeAfterAlgorithm'
import type { Band, MatrixData, TopChange } from './beforeAfterAlgorithm'

export function BeforeAfterTabContent() {
  const { t } = useTranslation()
  const query = useCurrentOrderQuery()

  return (
    <QueryBoundary
      query={query}
      keys={{ loading: 'findings.loading', failed: 'findings.failed', network: 'findings.network' }}
    >
      {(order) =>
        order ? (
          <ChartErrorBoundary>
            <BeforeAfterContent data={buildMatrix(order.prioritization)} />
          </ChartErrorBoundary>
        ) : (
          <Message>{t('findings.empty')}</Message>
        )
      }
    </QueryBoundary>
  )
}

function BeforeAfterContent({ data }: { data: MatrixData }) {
  const { t } = useTranslation()
  const { groups, matrix, cellIds, rankRanges, subio, seMantuvo, bajo, total, bandByGroup, topChanges } = data
  const N = groups.length
  const matchPct = Math.round((seMantuvo / total) * 100)

  return (
    <div className="flex flex-col gap-6">
      <ChartErrorBoundary>
        <section className="rounded-xl border border-border-panel bg-white p-6">
          <div className="grid grid-cols-4 divide-x divide-border-panel text-center">
            <div className="flex flex-col gap-1 px-4 py-2">
              <span className="font-title text-[2rem] leading-none text-navy">{subio}</span>
              <span className="font-body text-[0.875rem] text-gray">{t('findings.beforeAfter.subio')}</span>
            </div>
            <div className="flex flex-col gap-1 px-4 py-2">
              <span className="font-title text-[2rem] leading-none text-navy">{seMantuvo}</span>
              <span className="font-body text-[0.875rem] text-gray">{t('findings.beforeAfter.seMantuvo')}</span>
            </div>
            <div className="flex flex-col gap-1 px-4 py-2">
              <span className="font-title text-[2rem] leading-none text-navy">{bajo}</span>
              <span className="font-body text-[0.875rem] text-gray">{t('findings.beforeAfter.bajo')}</span>
            </div>
            <div className="flex flex-col gap-1 px-4 py-2">
              <span className="font-title text-[2rem] leading-none text-navy">
                {t('findings.beforeAfter.matchPct', { pct: matchPct })}
              </span>
              <span className="font-body text-[0.875rem] text-gray">{t('findings.beforeAfter.match')}</span>
            </div>
          </div>
        </section>
      </ChartErrorBoundary>

      <ChartErrorBoundary>
        <section className="rounded-xl border border-border-panel bg-white p-6">
          <h2 className="mb-5 font-title text-[1rem] text-navy">
            {t('findings.beforeAfter.matrixTitle')}
          </h2>
          <MatrixGrid groups={groups} matrix={matrix} cellIds={cellIds} rankRanges={rankRanges} N={N} />
        </section>
      </ChartErrorBoundary>

      {topChanges.length > 0 && (
        <ChartErrorBoundary>
          <section className="rounded-xl border border-border-panel bg-white">
            <div className="border-b border-border-panel px-6 py-4">
              <h2 className="font-title text-[1rem] text-navy">
                {t('findings.beforeAfter.topChangesTitle')}
              </h2>
            </div>
            <TopChangesTable topChanges={topChanges} groups={groups} rankRanges={rankRanges} />
          </section>
        </ChartErrorBoundary>
      )}

      <ChartErrorBoundary>
        <section className="rounded-xl border border-border-panel bg-white">
          <div className="border-b border-border-panel px-6 py-4">
            <h2 className="font-title text-[1rem] text-navy">
              {t('findings.beforeAfter.bandTitle')}
            </h2>
          </div>
          <BandComposition groups={groups} bandByGroup={bandByGroup} />
        </section>
      </ChartErrorBoundary>
    </div>
  )
}

function MatrixGrid({
  groups,
  matrix,
  cellIds,
  rankRanges,
  N,
}: {
  groups: PriorityGroup[]
  matrix: number[][]
  cellIds: string[][][]
  rankRanges: [number, number][]
  N: number
}) {
  const { t } = useTranslation()
  const [, setParams] = useSearchParams()

  const maxCount = Math.max(...matrix.flat())

  const openCell = (sgIdx: number, agIdx: number) => {
    const ids = cellIds[sgIdx][agIdx]
    if (ids.length === 0) return
    setParams(() => {
      const next = new URLSearchParams()
      next.set('tab', 'prioritized')
      next.set('from', 'chart')
      next.set('ids', ids.join(','))
      return next
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-body text-[0.875rem]">
        <thead>
          <tr>
            <th className="pb-3 text-left text-[0.75rem] font-normal text-gray">
              {t('findings.beforeAfter.byScore')} / {t('findings.beforeAfter.byAgent')}
            </th>
            {groups.map((g) => (
              <th key={g.position} className="pb-3 text-center font-semibold text-navy">
                {t('findings.beforeAfter.groupLabel', { n: g.position })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: N }, (_sg, sgIdx) => (
            <tr key={sgIdx}>
              <td className="py-1 pr-4 text-[0.75rem]">
                <div className="font-semibold text-navy">
                  {t('findings.beforeAfter.groupLabel', { n: sgIdx + 1 })}
                </div>
                <div className="tabular-nums text-gray">
                  {t('findings.beforeAfter.rankRange', {
                    min: rankRanges[sgIdx][0],
                    max: rankRanges[sgIdx][1],
                  })}
                </div>
              </td>
              {Array.from({ length: N }, (_ag, agIdx) => {
                const count = matrix[sgIdx][agIdx]
                const isDiag = sgIdx === agIdx
                const clickable = count > 0

                let bg: string | undefined
                let textColorClass = count === 0 ? 'text-gray' : 'text-navy'
                if (count > 0) {
                  const intensity = 20 + Math.round((count / maxCount) * 60)
                  bg = `color-mix(in srgb, var(--color-navy) ${intensity}%, white)`
                  if (intensity > 55) textColorClass = 'text-white'
                }

                const boxShadow = isDiag ? '0 0 0 2px var(--color-navy)' : undefined

                return (
                  <td key={agIdx} className="py-1 text-center">
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg font-body ${count > 0 ? 'font-semibold' : ''} ${textColorClass} ${clickable ? 'cursor-pointer' : ''}`}
                      style={{ backgroundColor: bg, boxShadow }}
                      aria-label={t('findings.beforeAfter.cellLabel', { count, sg: sgIdx + 1, ag: agIdx + 1 })}
                      title={clickable ? t('findings.beforeAfter.cellClickable', { count }) : undefined}
                      role={clickable ? 'button' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? () => openCell(sgIdx, agIdx) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                openCell(sgIdx, agIdx)
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
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-5 flex flex-col gap-1.5 border-t border-border-panel pt-4">
        {groups.map((g) => (
          <li key={g.position} className="flex gap-2 font-body text-[0.8125rem]">
            <span className="shrink-0 font-semibold text-navy">
              {t('findings.beforeAfter.groupLabel', { n: g.position })}
            </span>
            <span className="text-gray">{g.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TopChangesTable({
  topChanges,
  groups,
  rankRanges,
}: {
  topChanges: TopChange[]
  groups: PriorityGroup[]
  rankRanges: [number, number][]
}) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-body text-[0.875rem]">
        <thead>
          <tr className="border-b border-border-panel text-left text-[0.75rem] font-normal text-gray">
            <th className="px-6 py-3 font-normal">{t('findings.beforeAfter.topChangesCve')}</th>
            <th className="px-4 py-3 font-normal">{t('findings.beforeAfter.topChangesComponent')}</th>
            <th className="px-4 py-3 font-normal">{t('findings.beforeAfter.topChangesScoreGroup')}</th>
            <th className="px-4 py-3 font-normal">{t('findings.beforeAfter.topChangesAgentGroup')}</th>
            <th className="px-4 py-3 font-normal">{t('findings.beforeAfter.topChangesDelta')}</th>
            <th className="px-4 py-3 font-normal">{t('findings.beforeAfter.topChangesReason')}</th>
          </tr>
        </thead>
        <tbody>
          {topChanges.map((c) => {
            const wentUp = c.agentGroup < c.scoreGroup
            const sgRange = rankRanges[c.scoreGroup - 1]
            const agGroup = groups[c.agentGroup - 1]
            return (
              <tr
                key={c.findingId}
                className="border-b border-border-panel last:border-0 hover:bg-panel"
              >
                <td className="px-6 py-3 font-mono text-[0.8125rem] text-navy">{c.cveId}</td>
                <td className="px-4 py-3 text-navy">{c.component}</td>
                <td className="px-4 py-3 tabular-nums text-navy">
                  {t('findings.beforeAfter.groupLabel', { n: c.scoreGroup })}{' '}
                  <span className="text-gray">
                    {t('findings.beforeAfter.rankRange', { min: sgRange[0], max: sgRange[1] })}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-navy">
                  {t('findings.beforeAfter.groupLabel', { n: c.agentGroup })}{' '}
                  <span className="text-[0.75rem] text-gray">{agGroup.title}</span>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-navy">
                  {wentUp
                    ? t('findings.beforeAfter.topChangesUp', { n: c.delta })
                    : t('findings.beforeAfter.topChangesDown', { n: c.delta })}
                </td>
                <td className="max-w-[16rem] px-4 py-3 text-gray">
                  <span className="line-clamp-2">{c.agentGroupReason}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BandComposition({
  groups,
  bandByGroup,
}: {
  groups: PriorityGroup[]
  bandByGroup: Record<Band, number>[]
}) {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-col gap-4 p-6">
      {groups.map((g, idx) => {
        const counts = bandByGroup[idx]
        const total = g.finding_ids.length

        const segments: { band: Band; left: number; width: number }[] = []
        let offset = 0
        for (const band of BANDS) {
          const count = counts[band]
          if (count > 0) {
            const width = (count / total) * 100
            segments.push({ band, left: offset, width })
            offset += width
          }
        }

        return (
          <li key={g.position} className="flex items-center gap-3 font-body text-[0.875rem]">
            <span className="w-8 shrink-0 text-right font-semibold text-navy">
              {t('findings.beforeAfter.groupLabel', { n: g.position })}
            </span>
            <div
              className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-panel"
              role="img"
              aria-label={`${t('findings.beforeAfter.groupLabel', { n: g.position })}: ${segments.map((s) => `${counts[s.band]} ${s.band}`).join(', ')}`}
            >
              {segments.map(({ band, left, width }) => (
                <div
                  key={band}
                  className="absolute inset-y-0"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: BAND_COLORS[band],
                  }}
                />
              ))}
            </div>
            <span className="w-8 shrink-0 tabular-nums text-right text-navy">{total}</span>
          </li>
        )
      })}
    </ul>
  )
}
