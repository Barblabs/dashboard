import { localStore } from './localStore'
import type { SlackChannel, SlackFailedDelivery, SlackInstallation } from '../api/slack'

export const MOCK_CHANNELS: SlackChannel[] = [
  { id: 'C09SECGRP1', is_private: false, name: 'security-team' },
  { id: 'C02ENGINEE', is_private: false, name: 'engineering' },
  { id: 'C07PRIVAL3', is_private: true, name: 'sec-alerts-private' },
]

export const mockInstallationActive: SlackInstallation = {
  team_id: 'T0123456789',
  team_name: 'BARBATTACK Demo',
  channel_id: MOCK_CHANNELS[0].id,
  channel_name: MOCK_CHANNELS[0].name,
  state: 'active',
}

export const mockInstallationPendingChannel: SlackInstallation = {
  team_id: 'T0123456789',
  team_name: 'BARBATTACK Demo',
  channel_id: '',
  channel_name: '',
  state: 'active',
}

export const mockInstallationNeedsReauth: SlackInstallation = {
  ...mockInstallationActive,
  state: 'needs re-authorisation',
}

// One delivery the Slack app refused because its Messages tab is off in the Slack
// configuration; an admin enables it and retries.
export const mockDeliveryOne: SlackFailedDelivery = {
  target: '#security-team',
  target_kind: 'channel',
  attempts: 1,
  created_at: new Date().toISOString(),
  failure_code: 'messages_tab_disabled',
  last_error: 'messages tab disabled in Slack app configuration',
  kind: 'finding',
}

export const slackInstallationStore = localStore<SlackInstallation | null>(
  'barbattack_slack_installation',
  null,
)

export const slackDeliveriesStore = localStore<SlackFailedDelivery[]>(
  'barbattack_slack_deliveries',
  [],
)
