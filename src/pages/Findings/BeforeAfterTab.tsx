import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { useCurrentOrderQuery } from '../../api/prioritizations'
import type { CurrentOrder, PriorityGroup } from '../../api/prioritizations'
import { Card, CardHeader } from '../../components/ui/Card'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { InfoTip } from '../../components/ui/InfoTip'
import { CARD_EDGE, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { QueryBoundary } from '../../components/QueryBoundary'
import { EMPTY } from '../../i18n/format'
import { Message } from '../../components/ui/Message'
import { Modal } from '../../components/ui/Modal'
import { buildMatrix } from './beforeAfterAlgorithm'
import type { MatrixData, TopChange } from './beforeAfterAlgorithm'
import { BandLegend } from './BandLegend'
import { BAND_COLORS, BANDS, type Band } from './bands'
import { FindingDetail } from './FindingDetail'

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
            <BeforeAfterContent order={order} data={buildMatrix(order.prioritization)} />
          </ChartErrorBoundary>
        ) : (
          <Message>{t('findings.empty')}</Message>
        )
      }
    </QueryBoundary>
  )
}

const FINDING_PARAM = 'finding'

function BeforeAfterContent({ order, data }: { order: CurrentOrder; data: MatrixData }) {
  const { t } = useTranslation()
  // A movement opens its Finding's detail over this tab, as the list does, and closing it comes back here.
  const [params, setParams] = useSearchParams()
  const closeButton = useRef<HTMLButtonElement>(null)
  const openId = params.get(FINDING_PARAM)
  const open = order.prioritization.findings.find((f) => f.finding_id === openId)
  const setOpen = (id: string | null) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) next.set(FINDING_PARAM, id)
      else next.delete(FINDING_PARAM)
      return next
    })
  const { groups, matrix, cellIds, rankRanges, subio, seMantuvo, bajo, total, bandByGroup, topChanges } = data
  const N = groups.length
  const matchPct = Math.round((seMantuvo / total) * 100)

  return (
    <div className="flex flex-col gap-6">
      <ChartErrorBoundary>
        <Card className="relative p-6">
          {/* The figures have no header to hold the "?", so it sits in the Card's corner. */}
          <div className="absolute top-3 right-3">
            <InfoTip title={t('findings.tabs.beforeAfter')} text={t('findings.beforeAfter.summaryHelp')} />
          </div>
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
        </Card>
      </ChartErrorBoundary>

      <ChartErrorBoundary>
        <Card>
          <CardHeader title={t('findings.beforeAfter.matrixTitle')} help={t('findings.beforeAfter.matrixHelp')} />
          <div className="p-6">
            <MatrixGrid groups={groups} matrix={matrix} cellIds={cellIds} rankRanges={rankRanges} N={N} />
          </div>
        </Card>
      </ChartErrorBoundary>

      {topChanges.length > 0 && (
        <ChartErrorBoundary>
          <Card>
            <CardHeader title={t('findings.beforeAfter.topChangesTitle')} help={t('findings.beforeAfter.topChangesHelp')} />
            <TopChangesTable topChanges={topChanges} groups={groups} rankRanges={rankRanges} onOpen={setOpen} />
          </Card>
        </ChartErrorBoundary>
      )}

      <ChartErrorBoundary>
        <Card>
          <CardHeader title={t('findings.beforeAfter.bandTitle')} help={t('findings.beforeAfter.bandHelp')} />
          <BandComposition groups={groups} bandByGroup={bandByGroup} />
        </Card>
      </ChartErrorBoundary>

      <Modal open={open !== undefined} onClose={() => setOpen(null)} width="xl" initialFocus={closeButton}>
        {open && (
          <FindingDetail order={order} finding={open} onClose={() => setOpen(null)} closeButton={closeButton} />
        )}
      </Modal>
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
  const navigate = useNavigate()

  const maxCount = Math.max(...matrix.flat())

  const openCell = (sgIdx: number, agIdx: number) => {
    const ids = cellIds[sgIdx][agIdx]
    if (ids.length === 0) return
    void navigate(`/findings?from=chart&ids=${ids.join(',')}`)
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
              <th key={g.position} className="pb-3 text-center text-[0.75rem] font-semibold text-navy">
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
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg font-body ${count > 0 ? 'font-semibold' : ''} ${textColorClass} ${clickable ? 'focus-ring cursor-pointer transition-[filter] duration-150 hover:brightness-90' : ''}`}
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
                      {count === 0 ? EMPTY : count}
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
  onOpen,
}: {
  topChanges: TopChange[]
  groups: PriorityGroup[]
  rankRanges: [number, number][]
  onOpen: (findingId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse font-body text-[0.875rem]">
        <thead>
          <tr className={HEADER_ROW}>
            <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.beforeAfter.topChangesCve')}</th>
            <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.beforeAfter.topChangesComponent')}</th>
            <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.beforeAfter.topChangesScoreGroup')}</th>
            <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('findings.beforeAfter.topChangesAgentGroup')}</th>
            <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('findings.beforeAfter.topChangesDelta')}</th>
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
                // The whole row is the mouse target; the button stays the keyboard and screen reader path.
                onClick={() => onOpen(c.findingId)}
                className="cursor-pointer border-b border-border-row transition-colors duration-150 last:border-0 hover:bg-row-hover"
              >
                <td className={`px-4 py-3 whitespace-nowrap ${CARD_EDGE}`}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpen(c.findingId)
                    }}
                    aria-label={t('findings.open', { cve: c.cveId })}
                    className="focus-ring cursor-pointer rounded-xs font-mono text-[0.8125rem] font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    {c.cveId}
                  </button>
                </td>
                <td className={`px-4 py-3 text-navy ${CARD_EDGE}`}>{c.component}</td>
                <td className={`px-4 py-3 whitespace-nowrap tabular-nums text-navy ${CARD_EDGE}`}>
                  {t('findings.beforeAfter.groupLabel', { n: c.scoreGroup })}{' '}
                  <span className="text-gray">
                    {t('findings.beforeAfter.rankRange', { min: sgRange[0], max: sgRange[1] })}
                  </span>
                </td>
                <td className={`px-4 py-3 tabular-nums text-navy ${CARD_EDGE}`}>
                  {t('findings.beforeAfter.groupLabel', { n: c.agentGroup })}{' '}
                  <span className="text-[0.75rem] text-gray">{agGroup.title}</span>
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-semibold text-navy ${CARD_EDGE}`}>
                  {wentUp
                    ? t('findings.beforeAfter.topChangesUp', { n: c.delta })
                    : t('findings.beforeAfter.topChangesDown', { n: c.delta })}
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
  const present = BANDS.filter((band) => bandByGroup.some((counts) => counts[band] > 0))

  return (
    <div className="flex flex-col gap-4 p-6">
      <BandLegend bands={present} />
      <ul className="flex flex-col gap-4">
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
                aria-label={`${t('findings.beforeAfter.groupLabel', { n: g.position })}: ${segments.map((s) => `${counts[s.band]} ${t(`findings.filter.bandValues.${s.band}`)}`).join(', ')}`}
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
    </div>
  )
}
