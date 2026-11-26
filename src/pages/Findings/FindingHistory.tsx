import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { CLOSE_REASONS } from '../../api/findingCloses'
import {
  SYNC_CLOSE_REASONS,
  useFindingHistoryQuery,
  type HistoryEntry,
  type OrderRange,
} from '../../api/prioritizations'
import { isOneOf } from '../../api/schemas'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ChevronRightIcon } from '../../components/ui/icons'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { scorePoints } from './score'
import { META } from './styles'
import { WrittenText } from './WrittenText'

/** The history reads at the size of the reason it explains, not of the notes around it. */
const ENTRY_TEXT = 'font-body text-[0.9375rem] leading-[1.5]'

type Movement = 'up' | 'down' | 'same'

/** A lower group is attended first: from Group 3 to Group 1 is up. */
function movementOf(entry: HistoryEntry): Movement | null {
  if (entry.group_before === null || entry.group_now === null) return null
  if (entry.group_now < entry.group_before) return 'up'
  if (entry.group_now > entry.group_before) return 'down'
  return 'same'
}

const MARK: Record<HistoryEntry['kind'] | Movement, string> = {
  up: '↑',
  down: '↓',
  same: '→',
  placed: '●',
  placed_again: '→',
  moved: '→',
  left: '○',
}

const MARK_TONE: Record<HistoryEntry['kind'] | Movement, string> = {
  up: 'text-critical',
  down: 'text-nav-active-bg',
  same: 'text-gray',
  placed: 'text-navy',
  placed_again: 'text-gray',
  moved: 'text-gray',
  left: 'text-gray',
}

function markOf(entry: HistoryEntry) {
  return movementOf(entry) ?? entry.kind
}

function headline(entry: HistoryEntry, t: TFunction): string {
  const values = { before: entry.group_before, now: entry.group_now }
  if (entry.kind === 'placed') return t('findings.detail.history.placed', values)
  if (entry.kind === 'left') return t('findings.detail.history.left')
  const movement = movementOf(entry)
  return movement ? t(`findings.detail.history.${movement}`, values) : t('findings.detail.history.same', values)
}

/** Why its place changed, a line each: what changed in it, or what changed above it. */
function causes(entry: HistoryEntry, t: TFunction): string[] {
  if (entry.kind === 'left') {
    // Only the newest entry gives one, while the Finding is still closed.
    const reason = closeReasonText(entry.close_reason, t)
    return [
      ...(wasAt(entry, t) ?? []),
      ...(reason ? [t('findings.detail.history.closedAs', { reason })] : []),
    ]
  }
  if (entry.kind === 'moved') {
    return [
      ...entry.groups_appeared.map((title) => t('findings.detail.history.appeared', { title })),
      ...entry.groups_gone.map((title) => t('findings.detail.history.gone', { title })),
    ]
  }
  if (entry.kind === 'placed') return []
  if (entry.changes.length === 0) return [t('findings.detail.history.changes.none')]
  return entry.changes.flatMap((change) => changeLines(entry, change, t))
}

function closeReasonText(reason: string | null, t: TFunction): string | null {
  if (reason === null) return null
  if (isOneOf(CLOSE_REASONS, reason)) return t(`findings.closeReasons.${reason}`)
  if (isOneOf(SYNC_CLOSE_REASONS, reason)) return t(`findings.detail.history.syncCloseReasons.${reason}`)
  return null
}

/** "#4–#6", or "#4" for a group of one. */
function orderText({ from, to }: OrderRange): string {
  return from === to ? `#${from}` : `#${from}–#${to}`
}

/** Where a Finding that left the order was: it has no now to compare. */
function wasAt(entry: HistoryEntry, t: TFunction): string[] | null {
  const place = [
    entry.group_before !== null && t('findings.detail.history.group', { position: entry.group_before }),
    entry.order_before && orderText(entry.order_before),
    entry.score_before !== null && t('findings.detail.history.score', { score: scorePoints(entry.score_before) }),
  ].filter((part) => typeof part === 'string')
  return place.length > 0 ? [t('findings.detail.history.wasAt', { place: place.join(' · ') })] : null
}

type Standing = 'ahead' | 'behind' | 'matches'

/** Ahead when the order attends it before its Score alone would; a group's range counts as one place. */
function standingOf(rank: number, order: OrderRange): Standing {
  if (rank > order.to) return 'ahead'
  if (rank < order.from) return 'behind'
  return 'matches'
}

/**
 * Where its Score alone would put it against where the order put it. The Score shows here
 * unless what changed already says how it moved.
 */
function Comparison({ entry }: { entry: HistoryEntry }) {
  const { t } = useTranslation()
  if (entry.rank_now === null || entry.order_now === null) return null
  const standing = standingOf(entry.rank_now, entry.order_now)
  const { score_before: before, score_now: now } = entry
  const scoreTold = entry.changes.includes('score_moved') && before !== null && now !== null
  const score =
    scoreTold || now === null
      ? null
      : before !== null && scorePoints(before) !== scorePoints(now)
        ? t('findings.detail.history.scoreMoved', { before: scorePoints(before), now: scorePoints(now) })
        : t('findings.detail.history.score', { score: scorePoints(now) })

  return (
    <p className={`${ENTRY_TEXT} flex flex-wrap items-center gap-x-2 gap-y-1 text-gray tabular-nums`}>
      <span>
        {[
          score,
          t('findings.detail.history.byScore', { rank: entry.rank_now }),
          t('findings.detail.history.inOrder', { order: orderText(entry.order_now) }),
        ]
          .filter((part) => part !== null)
          .join(' · ')}
      </span>
      {/* Only a gap between the two orders is worth a mark. */}
      {standing !== 'matches' && <Badge>{t(`findings.detail.history.standing.${standing}`)}</Badge>}
    </p>
  )
}

function changeLines(entry: HistoryEntry, change: HistoryEntry['changes'][number], t: TFunction): string[] {
  if (change === 'band_changed') {
    if (!entry.band) return []
    return [
      t('findings.detail.history.changes.band_changed', {
        from: t(`findings.detail.score.band.${entry.band.from}`),
        to: t(`findings.detail.score.band.${entry.band.to}`),
      }),
    ]
  }
  if (change === 'score_moved') {
    if (entry.score_before === null || entry.score_now === null) return []
    return [
      t('findings.detail.history.changes.score_moved', {
        from: scorePoints(entry.score_before),
        to: scorePoints(entry.score_now),
      }),
    ]
  }
  if (change === 'feedback') {
    if (entry.feedback.length === 0) return [t('findings.detail.history.changes.feedback')]
    return entry.feedback.map((f) =>
      t(
        f.verdict === 'should_be_earlier'
          ? 'findings.detail.history.changes.feedbackEarlier'
          : 'findings.detail.history.changes.feedbackLater',
        { note: f.note },
      ),
    )
  }
  return [t(`findings.detail.history.changes.${change}`)]
}

/**
 * Every change of the Finding's place, newest first. The newest entry's reason is the one the
 * detail reads first, so only older ones offer theirs.
 */
export function FindingHistory({ findingId, newestReasonShown }: { findingId: string; newestReasonShown: boolean }) {
  const { t } = useTranslation()
  const history = useFindingHistoryQuery(findingId)

  if (history.isPending) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">{t('findings.detail.history.loading')}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className="flex animate-pulse flex-col gap-2">
            <span className="h-4 w-2/3 rounded bg-border-row" />
            <span className="h-3 w-1/3 rounded bg-border-row" />
          </div>
        ))}
      </div>
    )
  }

  if (history.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className={`${META} text-high`}>
          {requestErrorText(history.error, t, {
            fallback: 'findings.detail.history.failed',
            network: 'findings.detail.history.network',
          })}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void history.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (history.data.length === 0) return <p className={`${META} text-gray`}>{t('findings.detail.history.empty')}</p>

  return (
    <ol className="flex flex-col">
      {history.data.map((entry, i) => (
        <Entry
          key={entry.prioritization_id}
          entry={entry}
          offerReason={entry.reason.trim() !== '' && !(i === 0 && newestReasonShown)}
        />
      ))}
    </ol>
  )
}

function Entry({ entry, offerReason }: { entry: HistoryEntry; offerReason: boolean }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const [open, setOpen] = useState(false)
  const mark = markOf(entry)
  const lines = causes(entry, t)

  return (
    // The rule between marks reads as a timeline; the last entry ends it.
    <li className="group/entry relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-6 bottom-0 left-[0.5625rem] w-px bg-border-row group-last/entry:hidden"
      />
      <span aria-hidden="true" className={`text-center font-body text-[1.0625rem] leading-7 ${MARK_TONE[mark]}`}>
        {MARK[mark]}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-body text-[1.0625rem] leading-7 font-semibold text-navy">{headline(entry, t)}</span>
          <span className={`${META} text-gray tabular-nums`}>{formatDate(entry.created_at)}</span>
        </p>
        {entry.title && entry.group_now !== null && (
          <p className={`${ENTRY_TEXT} text-gray`}>{entry.title}</p>
        )}
        {entry.kind === 'moved' && <p className={`${ENTRY_TEXT} text-gray`}>{t('findings.detail.history.movedNote')}</p>}
        {lines.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {lines.map((line, i) => (
              <li key={i} className={`${ENTRY_TEXT} text-navy`}>
                {line}
              </li>
            ))}
          </ul>
        )}
        <Comparison entry={entry} />
        {offerReason && (
          <>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="focus-ring flex cursor-pointer items-center gap-1 self-start rounded-sm font-body text-[0.875rem] font-semibold text-nav-active-bg hover:underline"
            >
              <ChevronRightIcon
                className={`shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
              />
              {t('findings.detail.history.why')}
            </button>
            {open && (
              <div className="animate-fade-in border-l-2 border-border-panel pl-3">
                <WrittenText text={entry.reason} marks={entry.evidence.map((e) => e.value)} />
              </div>
            )}
          </>
        )}
      </div>
    </li>
  )
}
