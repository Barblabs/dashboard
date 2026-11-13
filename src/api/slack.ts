import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { api } from './client'
import type { Known, Schemas } from './schemas'

/*
 * Slack delivery state: one installation per Customer, plus the failed deliveries the
 * worker gave up on. Everything hangs off this root key, so disconnecting removes the
 * whole tree (mirrors `connectionScopeKey` in cmdb.ts).
 */
export const SLACK_KEY = ['slack'] as const
export const SLACK_INSTALLATION_KEY = [...SLACK_KEY, 'installation'] as const
export const SLACK_CHANNELS_KEY = [...SLACK_KEY, 'channels'] as const
export const SLACK_FAILED_KEY = [...SLACK_KEY, 'deliveries', 'failed'] as const

export type SlackInstallation = Schemas['SlackInstallationResponse']
/** Channel ids start as empty strings until an admin finishes the connection. */
export type UnsetChannel = SlackInstallation & { channel_id: ''; channel_name: '' }

export type SlackChannel = Schemas['SlackChannelResponse']
export type SlackChannelRequest = Known<Schemas['SlackChannelRequest']>

export type SlackFailedDelivery = Schemas['SlackFailedDeliveryResponse']

export type SlackStartResponse = Schemas['SlackStartResponse']
/** The test endpoint is a plain result body; a refusal carries Slack's code. */
export type SlackTestResult = Schemas['SlackTestResponse']

export type SlackRetryResult = Schemas['SlackRetryResponse']

const installationQuery = queryOptions({
  queryKey: SLACK_INSTALLATION_KEY,
  queryFn: () => api.get<SlackInstallation | null>('/slack/installation'),
})

const channelsQuery = queryOptions({
  queryKey: SLACK_CHANNELS_KEY,
  queryFn: () => api.get<{ channels: SlackChannel[] }>('/slack/channels'),
})

const failedDeliveriesQuery = queryOptions({
  queryKey: SLACK_FAILED_KEY,
  queryFn: () => api.get<{ deliveries: SlackFailedDelivery[] }>('/slack/deliveries/failed'),
})

export function useSlackInstallationQuery() {
  return useQuery(installationQuery)
}

export function useSlackChannelsQuery() {
  return useQuery(channelsQuery)
}

export function useFailedDeliveriesQuery() {
  return useQuery(failedDeliveriesQuery)
}

function refetchInstallation(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: SLACK_INSTALLATION_KEY })
}

export function useSlackInstallStartMutation() {
  return useMutation({
    mutationFn: () => api.post<SlackStartResponse>('/slack/install/start'),
  })
}

/*
 * Writes the channel id/name the delivered Security Team channel has; the backend stores it
 * and the installation finishes. `setQueryData` keeps the fresh payload without refetching.
 */
export function useSetSlackChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: SlackChannelRequest) =>
      api.put<SlackInstallation>('/slack/installation', channel),
    onSuccess: (installation) => {
      queryClient.setQueryData(installationQuery.queryKey, installation)
    },
  })
}

export function useSlackTestMutation() {
  return useMutation({
    mutationFn: () => api.post<SlackTestResult>('/slack/installation/test'),
  })
}

/*
 * The backend empties the failed rows it re-queued (except malformed ones). Invalidating
 * lets the table refetch and show what remains instead of wiping it locally.
 */
export function useRetryFailedDeliveriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<SlackRetryResult>('/slack/deliveries/retry'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SLACK_FAILED_KEY })
      void queryClient.invalidateQueries({ queryKey: SLACK_INSTALLATION_KEY })
    },
  })
}

export function useDisconnectSlackMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/slack/installation'),
    onSuccess: () => {
      queryClient.setQueryData(installationQuery.queryKey, null)
      queryClient.removeQueries({ queryKey: SLACK_KEY })
    },
    onError: () => refetchInstallation(queryClient),
  })
}
