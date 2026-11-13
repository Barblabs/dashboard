import type { ParseKeys } from 'i18next'

/*
 * The row `failure_code` and Slack-test `error` codes are stable ids the backend emits.
 * An unrecognized code is shown raw; it is still worth surfacing because support can act on it.
 */
const CODE_KEYS: Record<string, ParseKeys> = {
  owner_unreachable: 'slack.codes.owner_unreachable',
  channel_unreachable: 'slack.codes.channel_unreachable',
  auth_revoked: 'slack.codes.auth_revoked',
  malformed_payload: 'slack.codes.malformed_payload',
  slack_error: 'slack.codes.slack_error',
  messages_tab_disabled: 'slack.codes.messages_tab_disabled',
  users_not_found: 'slack.codes.users_not_found',
  channel_not_found: 'slack.codes.channel_not_found',
}

export function slackCodeKey(code: string): ParseKeys | null {
  return CODE_KEYS[code] ?? null
}
