import { z, type ZodType } from 'zod'
import type { SlackChannel, SlackFailedDelivery, SlackInstallation } from '../api/slack'
import { localStore } from './localStore'

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

const installationSchema = z.strictObject({
  team_id: z.string(),
  team_name: z.string(),
  channel_id: z.string(),
  channel_name: z.string(),
  state: z.enum(['active', 'needs re-authorisation', 'removed']),
}) satisfies ZodType<SlackInstallation>

const deliverySchema = z.strictObject({
  target: z.string(),
  target_kind: z.string(),
  kind: z.string(),
  attempts: z.number().int(),
  created_at: z.string(),
  failure_code: z.string().optional(),
  last_error: z.string().optional(),
}) satisfies ZodType<SlackFailedDelivery>

export const slackInstallationStore = localStore('barbattack_slack_installation', installationSchema.nullable(), null)

export const slackDeliveriesStore = localStore('barbattack_slack_deliveries', z.array(deliverySchema), [])
