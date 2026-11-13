import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useDisconnectSlackMutation,
  useSetSlackChannelMutation,
  useSlackChannelsQuery,
  useSlackTestMutation,
  type SlackInstallation,
} from '../../api/slack'
import { requestErrorText } from '../../i18n/errors'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Alert } from '../../components/ui/Alert'
import { slackCodeKey } from './slackCodes'
import { useSlackInstallConnect } from './useSlackInstallConnect'

const DETAIL = 'overflow-hidden text-[0.8125rem] text-ellipsis whitespace-nowrap'
const COPY = 'font-mono text-navy'
const SEPARATOR = 'text-[0.875rem] text-border-panel'
const STRIP = 'flex animate-fade-in flex-wrap items-center gap-4 border-t px-6 py-3.5'
const STRIP_TEXT = 'flex-1 font-body text-[0.875rem] leading-[1.4]'
const CONFIRM_STRIP = `${STRIP} border-border-panel bg-panel`

interface Props {
  installation: SlackInstallation
  readOnly?: boolean
}

export function SlackInstallationBar({ installation, readOnly = false }: Props) {
  const { t } = useTranslation()
  const channelsQuery = useSlackChannelsQuery()
  const setChannelMutation = useSetSlackChannelMutation()
  const testMutation = useSlackTestMutation()
  const disconnectMutation = useDisconnectSlackMutation()
  const install = useSlackInstallConnect()
  const [showConfirm, setShowConfirm] = useState(false)

  const channelSet = installation.channel_id !== ''
  const needsReauth = installation.state === 'needs re-authorisation'
  const testResult = testMutation.data

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-panel">
      <div className="flex flex-wrap items-center gap-4 bg-white px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="solid">
            <span className="size-[7px] shrink-0 rounded-full bg-cyan" />
            {t('slack.connected.badge')}
          </Badge>
          <span className={`${DETAIL} ${COPY}`}>{installation.team_name}</span>
          <span className={SEPARATOR}>·</span>
          <span className={`${DETAIL} ${channelSet ? COPY : 'font-body text-gray'}`}>
            {channelSet ? `#${installation.channel_name}` : t('slack.channels.notSet')}
          </span>
          {needsReauth && (
            <>
              <span className={SEPARATOR}>·</span>
              <Badge variant="warning">{t('slack.connected.needsReauth')}</Badge>
            </>
          )}
        </div>

        {!readOnly && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {needsReauth ? (
              <Button size="sm" loading={install.pending} onClick={() => void install.connect()}>
                {t('slack.connected.reauthorise')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={!channelSet || testMutation.isPending}
                loading={testMutation.isPending}
                onClick={() => testMutation.mutate()}
              >
                {testMutation.isPending
                  ? t('slack.connected.actions.testing')
                  : t('slack.connected.actions.test')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={disconnectMutation.isPending}
              onClick={() => setShowConfirm(true)}
            >
              {t('slack.connected.actions.disconnect')}
            </Button>
          </div>
        )}
      </div>

      {/* The Security Team channel must be picked before deliveries can flow; once set,
          an admin can change it at any time. A reader only sees the choice or the wait. */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border-panel px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-body text-[0.8125rem] font-semibold text-navy">
            {t('slack.channels.label')}
          </span>
          <p className="font-body text-[0.8125rem] leading-[1.4] text-gray">
            {t('slack.channels.help')}
          </p>
        </div>
        {readOnly ? (
          <p className="font-body text-[0.875rem] text-gray">
            {channelSet ? `#${installation.channel_name}` : t('slack.channels.viewer')}
          </p>
        ) : (
          <div className="flex w-64 shrink-0 flex-col gap-1.5">
            <Select
              aria-label={t('slack.channels.label')}
              disabled={channelsQuery.isLoading || setChannelMutation.isPending}
              value={installation.channel_id}
              onChange={(event) => {
                const option = channelsQuery.data?.channels.find((c) => c.id === event.target.value)
                if (option) setChannelMutation.mutate({ channel_id: option.id, channel_name: option.name })
              }}
            >
              <option value="">{t('slack.channels.select')}</option>
              {channelsQuery.data?.channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.is_private ? '🔒 ' : '#'}
                  {channel.name}
                </option>
              ))}
            </Select>
            {(channelsQuery.isError || setChannelMutation.isError) && (
              <p className="font-body text-[0.8125rem] text-critical">
                {requestErrorText(channelsQuery.error ?? setChannelMutation.error, t, {
                  fallback: channelsQuery.error
                    ? 'slack.channels.loadFailed'
                    : 'slack.channels.changeFailed',
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Test feedback stays in place until the next test or save. */}
      {testResult?.ok && (
        <div className="border-t border-border-panel px-6 py-3">
          <Alert tone="success" className="py-2">
            {channelSet
              ? t('slack.connected.testSucceeded', { channel: `#${installation.channel_name}` })
              : t('slack.connected.testSucceededNoChannel')}
          </Alert>
        </div>
      )}
      {testResult?.ok === false && (
        <div className="border-t border-border-panel px-6 py-3">
          <Alert tone="error" className="py-2">
            {testResult.error
              ? t(slackCodeKey(testResult.error) ?? 'slack.connected.testFailed')
              : t('slack.connected.testFailed')}
          </Alert>
        </div>
      )}
      {testMutation.isError && (
        <div className="border-t border-border-panel px-6 py-3">
          <Alert tone="error" className="py-2">
            {requestErrorText(testMutation.error, t, { fallback: 'slack.connected.testFailed' })}
          </Alert>
        </div>
      )}

      {!readOnly && showConfirm && (
        <div className={CONFIRM_STRIP}>
          {disconnectMutation.isError ? (
            <p role="alert" className={`${STRIP_TEXT} text-critical`}>
              {requestErrorText(disconnectMutation.error, t, {
                fallback: 'slack.connected.disconnectFailed',
              })}
            </p>
          ) : (
            <p className={`${STRIP_TEXT} text-navy`}>{t('slack.connected.confirm.text')}</p>
          )}
          <div className="flex shrink-0 gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
            >
              {t('slack.connected.confirm.confirm')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                disconnectMutation.reset()
                setShowConfirm(false)
              }}
            >
              {t('slack.connected.confirm.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
