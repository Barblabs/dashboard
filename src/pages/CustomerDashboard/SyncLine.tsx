import { useTranslation } from 'react-i18next'
import { useSourceQuery } from '../../api/cmdb'
import { useDateFormat, useRelativeTime } from '../../i18n/format'

const DOT = 'inline-block h-2 w-2 shrink-0 rounded-full'

export function SyncLine() {
  const { t } = useTranslation()
  const relativeTime = useRelativeTime()
  const formatDate = useDateFormat()
  const { data: source } = useSourceQuery()

  if (!source) return null
  const { last_sync, last_sync_failure } = source

  if (last_sync_failure && (last_sync === null || new Date(last_sync_failure.at) > new Date(last_sync))) {
    const time = relativeTime(last_sync_failure.at)
    return (
      <Line dot="bg-critical">
        {last_sync === null
          ? t('dashboard.sync.failedFirst', { time })
          : t('dashboard.sync.failed', { time, date: formatDate(last_sync) })}
      </Line>
    )
  }

  if (last_sync === null) return null
  return <Line dot="bg-good">{t('dashboard.sync.synced', { time: relativeTime(last_sync) })}</Line>
}

function Line({ dot, children }: { dot: string; children: string }) {
  return (
    <p className="-mt-3 flex items-center gap-2 font-body text-[0.875rem] text-gray">
      <span aria-hidden="true" className={`${DOT} ${dot}`} />
      {children}
    </p>
  )
}
