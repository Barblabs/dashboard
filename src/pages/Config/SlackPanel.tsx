import { useTranslation } from 'react-i18next'
import { useSlackInstallationQuery } from '../../api/slack'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { requestErrorText } from '../../i18n/errors'
import { SlackInstallationBar } from './SlackInstallationBar'
import { SlackFailedDeliveries } from './SlackFailedDeliveries'
import { useSlackInstallConnect } from './useSlackInstallConnect'

const KEYS = {
  loading: 'slack.loading',
  failed: 'slack.loadFailed',
  network: 'slack.networkError',
} as const

export function SlackPanel({ readOnly }: { readOnly: boolean }) {
  const installationQuery = useSlackInstallationQuery()

  return (
    <QueryBoundary query={installationQuery} keys={KEYS}>
      {(installation) => (
        <div className="flex animate-fade-in flex-col gap-6 pt-6">
          {installation === null ? (
            <SlackNotConnected readOnly={readOnly} />
          ) : (
            <>
              <SlackInstallationBar installation={installation} readOnly={readOnly} />
              <SlackFailedDeliveries />
            </>
          )}
        </div>
      )}
    </QueryBoundary>
  )
}

function SlackNotConnected({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation()
  const install = useSlackInstallConnect()
  const errorText =
    install.error &&
    requestErrorText(install.error, t, {
      fallback: 'slack.notConnected.failed',
    })

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <h2 className="font-title text-[1rem] text-navy">{t('slack.notConnected.title')}</h2>
      <p className="max-w-md font-body text-[0.875rem] leading-[1.5] text-gray">
        {t('slack.notConnected.description')}
      </p>
      {readOnly ? (
        <p className="font-body text-[0.875rem] text-gray">{t('slack.notConnected.viewer')}</p>
      ) : (
        <>
          <Button onClick={() => void install.connect()} disabled={install.pending} loading={install.pending}>
            {install.pending ? t('slack.notConnected.opening') : t('slack.notConnected.action')}
          </Button>
          {errorText && (
            <Alert tone="error" className="max-w-md">
              {errorText}
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
