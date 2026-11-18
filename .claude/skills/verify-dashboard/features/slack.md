# Slack delivery

## Sub-features
- "Slack" tab on `/config`, reachable with or without a CMDB
- Not connected: "BARBATTACK isn't delivering to Slack yet" with "Connect Slack" (opens Slack's consent page in a popup from `POST /slack/install/start`; when the popup closes the panel refetches); viewer sees "Slack delivery is not set up for your organization."
- Connected bar: "Slack connected", team name, channel or "Not set", "Send test" (disabled until a channel is set) with "Test message sent to #channel." or a failure text, "Disconnect" with a confirmation strip ("Yes, disconnect")
- Revoked authorization: "Slack authorization was revoked." badge and "Re-authorise" instead of "Send test"
- "Security Team channel" select (public channels with #, private with 🔒); viewer sees the channel or "The admin chooses the channel. Contact them to finish the setup."
- "Failed deliveries": "N failed delivery/deliveries", table (Target, Target kind, Attempts, Created, Failure code, Details), "Retry all" with "Returned N deliveries to the queue.", "No failed deliveries."

## How to get to it (user POV)
`/config`, tab "Slack".

## Driving it with Playwright
`node drive.mjs slack`: Connect Slack (popup blocked, its slack.com URL recorded in `externalRequests`), then `seedMockBackend` writes the installation the OAuth would leave (no channel) and one failed delivery, pick `#security-team`, Send test, Retry all, viewer read-only, disconnect.

Unreachable here: finishing the OAuth itself (Slack consent and the backend callback); the mock has no callback handler. Not covered: the revoked-authorization state (seed `state: 'needs re-authorisation'` to see it), test failure texts.

## Gotchas
- Mock state: localStorage `barbattack_slack_installation` (null = not connected) and `barbattack_slack_deliveries`; channels are fixed in `src/mocks/slack-store.ts`.
- The mock's Retry all clears every delivery except `malformed_payload` ones.
- End state: `PUT /slack/installation` with `channel_id` `C09SECGRP1`, "No failed deliveries.", one `DELETE /slack/installation`, and the not-connected panel again.
