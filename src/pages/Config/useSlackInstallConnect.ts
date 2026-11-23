import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { refetchDeliveryState, useSlackInstallStartMutation } from '../../api/slack'
import { requestErrorText } from '../../i18n/errors'

type SlackConsent =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'awaitingConsent'; popup: Window }
  | { status: 'blocked' }
  | { status: 'failed'; error: Error }

/*
 * The consent popup closes itself through the `/slack/install/callback` route. While it is open
 * we poll for the close, then refresh everything the install may have changed; a refused
 * authorization polls the same path and refetches to the same nothing.
 */
export function useSlackInstallConnect() {
  const queryClient = useQueryClient()
  const start = useSlackInstallStartMutation()
  const [consent, setConsent] = useState<SlackConsent>({ status: 'idle' })

  useEffect(() => {
    if (consent.status !== 'awaitingConsent') return undefined
    const { popup } = consent
    const timer = window.setInterval(() => {
      if (!popup.closed) return
      setConsent({ status: 'idle' })
      refetchDeliveryState(queryClient)
    }, 500)
    return () => window.clearInterval(timer)
  }, [consent, queryClient])

  const connect = () => {
    setConsent({ status: 'starting' })
    start.mutate(undefined, {
      onSuccess: ({ authorize_url }) => {
        const popup = window.open(authorize_url, 'barbattack-slack-connect', 'width=620,height=700')
        setConsent(popup ? { status: 'awaitingConsent', popup } : { status: 'blocked' })
      },
      onError: (error) => setConsent({ status: 'failed', error }),
    })
  }

  return { consent, connect }
}

export function isConnecting({ status }: SlackConsent) {
  return status === 'starting' || status === 'awaitingConsent'
}

export function connectProblemText(consent: SlackConsent, t: TFunction): string | null {
  if (consent.status === 'blocked') return t('slack.notConnected.blocked')
  if (consent.status === 'failed') return requestErrorText(consent.error, t, { fallback: 'slack.notConnected.failed' })
  return null
}
