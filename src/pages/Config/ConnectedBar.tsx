import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useDisconnectMutation, useSyncMutation, type CmdbSource } from '../../api/cmdb'
import { ApiError } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'

interface Props {
  source: CmdbSource
  onEdit: () => void
}

function formatRelative(iso: string, t: TFunction, language: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return t('config.connected.lessThanAMinute')
  const format = new Intl.RelativeTimeFormat(language, { style: 'short' })
  if (minutes < 60) return format.format(-minutes, 'minute')
  return format.format(-Math.floor(minutes / 60), 'hour')
}

function isInvalidCredentials(error: Error | null): boolean {
  return (
    error instanceof ApiError &&
    error.failure.kind === 'http' &&
    error.failure.code === 'invalid_credentials'
  )
}

const DETAIL = 'overflow-hidden text-[13px] text-ellipsis whitespace-nowrap'
const SEPARATOR = 'text-[14px] text-border-panel'
const ALERT = 'flex flex-wrap items-center gap-4 border-t border-critical/15 bg-critical/4 px-6 py-3.5'
const ALERT_TEXT = 'flex-1 font-body text-[14px] leading-[1.4] text-critical'

export function ConnectedBar({ source, onEdit }: Props) {
  const { t, i18n } = useTranslation()
  const syncMutation = useSyncMutation()
  const disconnectMutation = useDisconnectMutation()
  const [showConfirm, setShowConfirm] = useState(false)

  const language = i18n.resolvedLanguage ?? i18n.language
  const isSyncing = syncMutation.isPending
  const lastSync = source.lastSync
    ? formatRelative(source.lastSync, t, language)
    : t('config.connected.never')

  /* The failed request carries a translatable code; the recorded failure only has the
     backend's message, so the request's text wins while it is on screen. */
  function syncFailureText(): string | null {
    if (isSyncing) return null
    if (syncMutation.isError) {
      return requestErrorText(syncMutation.error, t, { fallback: 'config.errors.syncFailed' })
    }
    const failure = source.lastSyncFailure
    if (!failure) return null
    return t('config.connected.lastSyncFailed', {
      time: formatRelative(failure.at, t, language),
      error: failure.error,
    })
  }

  const syncFailure = syncFailureText()

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-panel">
      <div className="flex flex-wrap items-center gap-4 bg-white px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="solid">
            <span className="size-[7px] shrink-0 rounded-full bg-cyan" />
            {t('config.connected.badge', {
              provider: t(`config.providers.${source.provider}.name`),
            })}
          </Badge>
          <span className={`${DETAIL} font-mono text-navy`}>{source.url}</span>
          {source.user !== null && (
            <>
              <span className={SEPARATOR}>·</span>
              <span className={`${DETAIL} font-mono text-navy`}>{source.user}</span>
            </>
          )}
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

      {syncFailure && (
        <div className={ALERT}>
          <p className={ALERT_TEXT}>{syncFailure}</p>
          {isInvalidCredentials(syncMutation.error) && (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={onEdit}>
              {t('config.connected.actions.updateLogin')}
            </Button>
          )}
        </div>
      )}

      {showConfirm && (
        <div className={ALERT}>
          <p className={ALERT_TEXT}>
            {disconnectMutation.isError
              ? requestErrorText(disconnectMutation.error, t, {
                  fallback: 'config.connected.disconnectFailed',
                })
              : t('config.connected.confirm.text')}
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                disconnectMutation.reset()
                setShowConfirm(false)
              }}
            >
              {t('config.connected.confirm.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
