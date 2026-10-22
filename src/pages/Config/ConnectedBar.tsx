import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useDisconnectMutation, useSyncMutation } from '../../api/queries'
import type { CmdbConnection } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

interface Props {
  connection: CmdbConnection
  onEdit: () => void
}

function formatLastSync(iso: string | null, t: TFunction, language: string): string {
  if (!iso) return t('config.connected.never')
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return t('config.connected.lessThanAMinute')
  const format = new Intl.RelativeTimeFormat(language, { style: 'short' })
  if (minutes < 60) return format.format(-minutes, 'minute')
  return format.format(-Math.floor(minutes / 60), 'hour')
}

const DETAIL = 'overflow-hidden text-[13px] text-ellipsis whitespace-nowrap'
const SEPARATOR = 'text-[14px] text-border-panel'

export function ConnectedBar({ connection, onEdit }: Props) {
  const { t, i18n } = useTranslation()
  const syncMutation = useSyncMutation()
  const disconnectMutation = useDisconnectMutation()
  const [showConfirm, setShowConfirm] = useState(false)

  const isSyncing = syncMutation.isPending
  const lastSync = formatLastSync(connection.lastSync, t, i18n.resolvedLanguage ?? i18n.language)

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-panel">
      <div className="flex flex-wrap items-center gap-4 bg-white px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="solid">
            <span className="size-[7px] shrink-0 rounded-full bg-cyan" />
            {t('config.connected.badge')}
          </Badge>
          <span className={`${DETAIL} font-mono text-navy`}>{connection.url}</span>
          <span className={SEPARATOR}>·</span>
          <span className={`${DETAIL} font-mono text-navy`}>{connection.user}</span>
          <span className={SEPARATOR}>·</span>
          <span className={`${DETAIL} font-body text-gray`}>
            {t('config.connected.lastSync', { time: lastSync })}
          </span>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" disabled={isSyncing} onClick={() => setShowConfirm(true)}>
            {t('config.connected.actions.disconnect')}
          </Button>
          <Button variant="secondary" size="sm" disabled={isSyncing} onClick={onEdit}>
            {t('config.connected.actions.edit')}
          </Button>
          <Button size="sm" disabled={isSyncing} onClick={() => syncMutation.mutate()}>
            {isSyncing ? t('config.connected.actions.syncing') : t('config.connected.actions.sync')}
          </Button>
        </div>
      </div>

      {showConfirm && (
        <div className="flex flex-wrap items-center gap-4 border-t border-critical/15 bg-critical/4 px-6 py-3.5">
          <p className="flex-1 font-body text-[14px] leading-[1.4] text-critical">
            {t('config.connected.confirm.text')}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
            >
              {t('config.connected.confirm.confirm')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
              {t('config.connected.confirm.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
