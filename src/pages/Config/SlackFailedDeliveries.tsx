import { useTranslation } from 'react-i18next'
import { useFailedDeliveriesQuery, useRetryFailedDeliveriesMutation } from '../../api/slack'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Message } from '../../components/ui/Message'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CELL, HEADER_CELL } from '../../components/ui/table'
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
  const query = useFailedDeliveriesQuery()
  const retry = useRetryFailedDeliveriesMutation()

  const deliveries = query.data?.deliveries ?? []
  const retrying = retry.isPending

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="font-title text-[1rem] text-navy">{t('slack.deliveries.title')}</h2>
            {query.isSuccess && (
              <span className="font-body text-[0.8125rem] text-gray">
                {t('slack.deliveries.count', { count: deliveries.length })}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            disabled={retrying || deliveries.length === 0}
            loading={retrying}
            onClick={() => retry.mutate()}
            title={t('slack.deliveries.retryAll')}
          >
            {t('slack.deliveries.retryAll')}
          </Button>
        )}
      </div>

      {retry.isSuccess && deliveries.length === 0 && (
        <div className="px-6 pt-4">
          <p className="font-body text-[0.875rem] text-nav-active-bg">
            {t('slack.deliveries.retrySucceeded', { count: retry.data.retried ?? 0 })}
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
            <div className="animate-fade-in overflow-x-auto">
              <table className="w-full border-collapse text-[0.875rem]">
                <thead>
                  <tr className="border-b-2 border-border-row">
                    <th className={HEADER_CELL}>{t('slack.deliveries.columns.target')}</th>
                    <th className={HEADER_CELL}>{t('slack.deliveries.columns.kind')}</th>
                    <th className={HEADER_CELL}>{t('slack.deliveries.columns.attempts')}</th>
                    <th className={HEADER_CELL}>{t('slack.deliveries.columns.created')}</th>
                    <th className={HEADER_CELL}>{t('slack.deliveries.columns.code')}</th>
                    <th className={HEADER_CELL}>{t('slack.deliveries.columns.error')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((delivery) => {
                    const code = delivery.failure_code ?? 'slack_error'
                    const codeKey = slackCodeKey(code)
                    return (
                      <tr key={`${delivery.target}-${delivery.created_at}`} className="hover:bg-row-hover">
                        <td className={CELL}>
                          <span className="block font-medium">{delivery.target}</span>
                        </td>
                        <td className={CELL}>
                          <span className="font-mono text-[0.8125rem]">{delivery.target_kind}</span>
                        </td>
                        <td className={CELL}>{delivery.attempts}</td>
                        <td className={CELL}>{formatDate(delivery.created_at)}</td>
                        <td className={CELL}>
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="muted">{codeKey ? t(codeKey) : code}</Badge>
                            <span className="font-mono text-[0.6875rem] text-gray">{code}</span>
                          </div>
                        </td>
                        <td className={CELL}>
                          <span className="font-mono text-[0.8125rem] text-gray">
                            {delivery.last_error ?? '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </QueryBoundary>
    </section>
  )
}
