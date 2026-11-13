import { useQueryClient } from '@tanstack/react-query'
import { SLACK_FAILED_KEY, SLACK_INSTALLATION_KEY, useSlackInstallStartMutation } from '../../api/slack'

/*
 * The consent popup closes itself through the `/slack/install/callback` route. We hold a
 * reference, poll for the close, then refresh everything the install may have changed; a
 * refused authorization polls the same path and refetches to the same nothing.
 */
export function useSlackInstallConnect() {
  const queryClient = useQueryClient()
  const start = useSlackInstallStartMutation()

  const connect = async () => {
    const { authorize_url } = await start.mutateAsync()
    const popup = window.open(authorize_url, 'barbattack-slack-connect', 'width=620,height=700')
    if (!popup) return
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer)
        void queryClient.invalidateQueries({ queryKey: SLACK_INSTALLATION_KEY })
        void queryClient.invalidateQueries({ queryKey: SLACK_FAILED_KEY })
      }
    }, 500)
  }

  return { connect, pending: start.isPending, error: start.error }
}
