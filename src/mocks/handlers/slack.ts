import { http, HttpResponse } from 'msw'
import type {
  SlackChannelRequest,
  SlackInstallation,
  UnsetChannel,
} from '../../api/slack'
import {
  MOCK_CHANNELS,
  slackDeliveriesStore,
  slackInstallationStore,
} from '../slack-store'
import { apiUrl } from '../url'
import { failure } from './responses'

function installationOrErr(channel: SlackChannelRequest | null = null) {
  const current = slackInstallationStore.load()
  if (!current) return null
  if (!channel) return current
  const next: SlackInstallation = { ...current, ...channel } as SlackInstallation
  slackInstallationStore.save(next)
  return next
}

export const slackHandlers = [
  http.get(apiUrl('/slack/installation'), () => {
    return HttpResponse.json(slackInstallationStore.load())
  }),

  http.get(apiUrl('/slack/channels'), () => {
    return HttpResponse.json({ channels: MOCK_CHANNELS })
  }),

  http.post(apiUrl('/slack/install/start'), () => {
    return HttpResponse.json({
      authorize_url:
        'https://slack.com/oauth/v2/authorize?client_id=mock&scope=channels%3Aread%2Cchat%3Awrite&state=mock-state',
    })
  }),

  http.put(apiUrl('/slack/installation'), async ({ request }) => {
    const body = (await request.json()) as SlackChannelRequest
    const channel = MOCK_CHANNELS.find((c) => c.id === body.channel_id)
    if (!channel) {
      return failure(400, 'slack_channel_not_set', 'choose a channel from the list first')
    }
    const installation = installationOrErr({
      channel_id: channel.id,
      channel_name: channel.name,
    })
    if (!installation) {
      return failure(404, 'slack_not_installed', 'no Slack installation')
    }
    return HttpResponse.json(installation)
  }),

  http.post(apiUrl('/slack/installation/test'), () => {
    const current = slackInstallationStore.load()
    if (!current) return HttpResponse.json({ ok: false, error: 'slack_not_installed' })
    if ((current as UnsetChannel).channel_id === '') {
      return HttpResponse.json({ ok: false, error: 'slack_channel_not_set' })
    }
    if (current.state === 'needs re-authorisation') {
      return HttpResponse.json({ ok: false, error: 'slack_needs_reauthorisation' })
    }
    return HttpResponse.json({ ok: true })
  }),

  http.delete(apiUrl('/slack/installation'), () => {
    slackInstallationStore.clear()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(apiUrl('/slack/deliveries/failed'), () => {
    return HttpResponse.json({ deliveries: slackDeliveriesStore.load() })
  }),

  http.post(apiUrl('/slack/deliveries/retry'), () => {
    const rows = slackDeliveriesStore.load()
    const remaining = rows.filter((row) => row.failure_code === 'malformed_payload')
    const retried = rows.length - remaining.length
    slackDeliveriesStore.save(remaining)
    return HttpResponse.json({ retried })
  }),
]
