import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDisconnectMutation, useSyncMutation, type CmdbSource } from '../../api/cmdb'
import { errorCode } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { useRelativeTime } from '../../i18n/format'
import {
  CONNECTION_DETAIL,
  CONNECTION_STRIP,
  CONNECTION_STRIP_TEXT,
  ConnectionBar,
  DisconnectConfirm,
} from './ConnectionBar'

interface Props {
  source: CmdbSource
  onEdit: () => void
  readOnly?: boolean
}

const ERROR_STRIP = `${CONNECTION_STRIP} border-critical/15 bg-critical/4`
const SUCCESS_STRIP = `${CONNECTION_STRIP} border-nav-active-bg/15 bg-nav-active-bg/6`

export function ConnectedBar({ source, onEdit, readOnly = false }: Props) {
  const { t } = useTranslation()
  const relativeTime = useRelativeTime()
  const syncMutation = useSyncMutation()
  const disconnectMutation = useDisconnectMutation()
  const [showConfirm, setShowConfirm] = useState(false)

  const isSyncing = syncMutation.isPending
  const lastSync = source.last_sync
    ? relativeTime(source.last_sync)
    : t('config.connected.never')

  const requestFailureText = requestErrorText(syncMutation.error, t, { fallback: 'config.errors.syncFailed' })
  const recordedFailure = source.last_sync_failure
  const recordedFailureText =
    recordedFailure &&
    t('config.connected.lastSyncFailed', {
      time: relativeTime(recordedFailure.at),
      error: recordedFailure.error,
    })
  const syncFailure = isSyncing ? null : (requestFailureText ?? recordedFailureText)

  return (
    <ConnectionBar
      badge={t('config.connected.badge', { provider: t(`config.providers.${source.provider}.name`) })}
      details={[
        <span key="url" className={`${CONNECTION_DETAIL} font-mono text-navy`}>{source.url}</span>,
        source.user !== null && (
          <span key="user" className={`${CONNECTION_DETAIL} font-mono text-navy`}>
            {source.user}
          </span>
        ),
        <span key="lastSync" className={`${CONNECTION_DETAIL} font-body text-gray`}>
          {t('config.connected.lastSync', { time: lastSync })}
        </span>,
      ]}
      actions={
        !readOnly && (
          <>
            <Button variant="ghost" size="sm" disabled={isSyncing} onClick={() => setShowConfirm(true)}>
              {t('config.connected.actions.disconnect')}
            </Button>
            <Button variant="secondary" size="sm" disabled={isSyncing} onClick={onEdit}>
              {t('config.connected.actions.edit')}
            </Button>
            <Button size="sm" loading={isSyncing} onClick={() => syncMutation.mutate()}>
              {isSyncing ? t('config.connected.actions.syncing') : t('config.connected.actions.sync')}
            </Button>
          </>
        )
      }
    >
      {syncMutation.isSuccess && (
        <div role="status" className={SUCCESS_STRIP}>
          <p className={`${CONNECTION_STRIP_TEXT} text-nav-active-bg`}>
            <span aria-hidden="true">✓</span> {t('config.connected.syncSucceeded')}
          </p>
        </div>
      )}

      {syncFailure && (
        <div role="alert" className={ERROR_STRIP}>
          <p className={`${CONNECTION_STRIP_TEXT} text-critical`}>{syncFailure}</p>
          {errorCode(syncMutation.error) === 'invalid_credentials' && (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={onEdit}>
              {t('config.connected.actions.updateLogin')}
            </Button>
          )}
        </div>
      )}

      {!readOnly && showConfirm && (
        <DisconnectConfirm
          text={t('config.connected.confirm.text')}
          error={requestErrorText(disconnectMutation.error, t, { fallback: 'config.connected.disconnectFailed' })}
          confirmLabel={t('config.connected.confirm.confirm')}
          pendingLabel={t('config.connected.confirm.pending')}
          cancelLabel={t('config.connected.confirm.cancel')}
          pending={disconnectMutation.isPending}
          onConfirm={() => disconnectMutation.mutate()}
          onCancel={() => {
            disconnectMutation.reset()
            setShowConfirm(false)
          }}
        />
      )}
    </ConnectionBar>
  )
}
