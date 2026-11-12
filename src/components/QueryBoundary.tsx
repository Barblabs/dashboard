import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { requestErrorText } from '../i18n/errors'
import { Button } from './ui/Button'
import { Message } from './ui/Message'

interface Keys {
  loading: ParseKeys
  failed: ParseKeys
  /** Said instead of `failed` when the server could not be reached at all. */
  network: ParseKeys
}

interface Props<T> {
  query: Pick<UseQueryResult<T>, 'data' | 'error' | 'refetch'>
  keys: Keys
  children: (data: T) => ReactNode
}

/*
 * Data already on screen wins over a failed refetch: the user keeps what they were reading
 * instead of losing it to an error. Only a query that never answered shows the failure.
 */
export function QueryBoundary<T>({ query, keys, children }: Props<T>) {
  const { t } = useTranslation()

  if (query.data !== undefined) return children(query.data)

  if (query.error) {
    return (
      <Message tone="error">
        {requestErrorText(query.error, t, { fallback: keys.failed, network: keys.network })}
        <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
          {t('common.retry')}
        </Button>
      </Message>
    )
  }

  return <Message>{t(keys.loading)}</Message>
}
