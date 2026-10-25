import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useDisconnectMutation, useSyncMutation, type CmdbSource } from '../../api/cmdb'
import { errorCode } from '../../api/client'
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

const DETAIL = 'overflow-hidden text-[0.8125rem] text-ellipsis whitespace-nowrap'
const SEPARATOR = 'text-[0.875rem] text-border-panel'
const STRIP = 'flex animate-fade-in flex-wrap items-center gap-4 border-t px-6 py-3.5'
const STRIP_TEXT = 'flex-1 font-body text-[0.875rem] leading-[1.4]'
const ERROR_STRIP = `${STRIP} border-critical/15 bg-critical/4`
const SUCCESS_STRIP = `${STRIP} border-nav-active-bg/15 bg-nav-active-bg/6`
// A question, not a failure: only the danger button carries the critical color.
const CONFIRM_STRIP = `${STRIP} border-border-panel bg-panel`

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

  const requestFailureText = syncMutation.isError
    ? requestErrorText(syncMutation.error, t, { fallback: 'config.errors.syncFailed' })
    : null
  const recordedFailure = source.lastSyncFailure
  const recordedFailureText =
    recordedFailure &&
    t('config.connected.lastSyncFailed', {
      time: formatRelative(recordedFailure.at, t, language),
      error: recordedFailure.error,
    })
  const syncFailure = isSyncing ? null : (requestFailureText ?? recordedFailureText)

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
          <Button size="sm" loading={isSyncing} onClick={() => syncMutation.mutate()}>
            {isSyncing ? t('config.connected.actions.syncing') : t('config.connected.actions.sync')}
          </Button>
        </div>
      </div>

      {syncMutation.isSuccess && (
        <div role="status" className={SUCCESS_STRIP}>
          <p className={`${STRIP_TEXT} text-nav-active-bg`}>
            <span aria-hidden="true">✓</span> {t('config.connected.syncSucceeded')}
          </p>
        </div>
      )}

      {syncFailure && (
        <div role="alert" className={ERROR_STRIP}>
          <p className={`${STRIP_TEXT} text-critical`}>{syncFailure}</p>
          {errorCode(syncMutation.error) === 'invalid_credentials' && (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={onEdit}>
              {t('config.connected.actions.updateLogin')}
            </Button>
          )}
        </div>
      )}

      {showConfirm && (
        <div className={CONFIRM_STRIP}>
          {disconnectMutation.isError ? (
            <p role="alert" className={`${STRIP_TEXT} text-critical`}>
              {requestErrorText(disconnectMutation.error, t, {
                fallback: 'config.connected.disconnectFailed',
              })}
            </p>
          ) : (
            <p className={`${STRIP_TEXT} text-navy`}>{t('config.connected.confirm.text')}</p>
          )}
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
