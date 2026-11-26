import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useFailedDeliveriesQuery, useRetryFailedDeliveriesMutation } from '../../api/slack'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Message } from '../../components/ui/Message'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { useCanEdit } from '../../auth/permissions'
import { slackCodeKey } from './slackCodes'

const KEYS = {
  loading: 'slack.deliveries.loading',
  failed: 'slack.deliveries.loadFailed',
  network: 'slack.deliveries.networkError',
} as const

export function SlackFailedDeliveries() {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const canEdit = useCanEdit()
  const titleId = useId()
  const query = useFailedDeliveriesQuery()
  const retry = useRetryFailedDeliveriesMutation()

  const deliveries = query.data?.deliveries ?? []
  const retrying = retry.isPending

  return (
    <Card aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-3">
          <h2 id={titleId} className="font-title text-[1rem] text-navy">{t('slack.deliveries.title')}</h2>
          {query.isSuccess && (
            <span className="font-body text-[0.8125rem] text-gray">
              {t('slack.deliveries.count', { count: deliveries.length })}
            </span>
          )}
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            disabled={retrying || deliveries.length === 0}
            loading={retrying}
            onClick={() => retry.mutate()}
          >
            {retrying ? t('slack.deliveries.retrying') : t('slack.deliveries.retryAll')}
          </Button>
        )}
      </div>

      {retry.isSuccess && deliveries.length === 0 && (
        <div className="px-6 pt-4">
          <p className="font-body text-[0.875rem] text-nav-active-bg">
            {t('slack.deliveries.retrySucceeded', { count: retry.data.retried })}
          </p>
        </div>
      )}
      {retry.isError && (
        <div role="alert" className="px-6 pt-4">
          <p className="font-body text-[0.875rem] text-critical">
            {requestErrorText(retry.error, t, { fallback: 'slack.deliveries.retryFailed' })}
          </p>
        </div>
      )}

      <QueryBoundary query={query} keys={KEYS}>
        {({ deliveries: rows }) =>
          rows.length === 0 ? (
            <Message>{t('slack.deliveries.empty')}</Message>
          ) : (
            <ul className="animate-fade-in font-body text-[0.875rem] text-navy">
              {rows.map((delivery) => {
                const code = delivery.failure_code ?? 'slack_error'
                const codeKey = slackCodeKey(code)
                return (
                  <li
                    key={`${delivery.target}-${delivery.created_at}`}
                    className="flex flex-col gap-1 border-t border-border-row px-6 py-4 first:border-t-0"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold break-all">{delivery.target}</span>
                      <span className="font-mono text-[0.8125rem] text-gray">{delivery.target_kind}</span>
                    </span>
                    <span className="text-[0.8125rem] text-gray">
                      {t('slack.deliveries.attempts', { count: delivery.attempts })} ·{' '}
                      {formatDate(delivery.created_at)}
                    </span>
                    {codeKey && <span>{t(codeKey)}</span>}
                    <span className="font-mono text-[0.75rem] break-all text-gray">
                      {delivery.last_error ? `${code}: ${delivery.last_error}` : code}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        }
      </QueryBoundary>
    </Card>
  )
}
