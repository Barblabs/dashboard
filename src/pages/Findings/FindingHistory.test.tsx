import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { HistoryEntry } from '../../api/prioritizations'
import { apiUrl } from '../../mocks/url'
import { renderApp, VIEWER } from '../../test/render'
import { server } from '../../test/server'

const JENKINS = 'CVE-2024-23897'
const MOVED_DOWN = 'Moved down from Group 1 to 2'

async function openFinding(cve: string, user = renderApp('/findings')) {
  await user.click(await screen.findByRole('button', { name: `Open ${cve}` }))
  return { user, dialog: await screen.findByRole('dialog', { name: cve }) }
}

async function openHistory(user: ReturnType<typeof renderApp>, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: /^Prioritization history/ }))
  return within(dialog).getByRole('region', { name: /^Prioritization history/ })
}

/** Counts the requests for a Finding's history, which the detail makes when it opens. */
function countHistoryRequests() {
  const count = { value: 0 }
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname.endsWith('/history')) count.value++
  })
  return count
}

function answerHistory(entries: HistoryEntry[]) {
  server.use(http.get(apiUrl('/findings/:id/history'), () => HttpResponse.json({ entries })))
}

const ENTRY: HistoryEntry = {
  prioritization_id: '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02',
  created_at: '2026-11-11T09:00:00Z',
  kind: 'placed',
  group_before: null,
  group_now: 2,
  rank_before: null,
  rank_now: 14,
  title: 'A group',
  reason: '',
  evidence: [],
  changes: [],
  band: null,
  score: null,
  feedback: [],
  groups_appeared: [],
  groups_gone: [],
  close_reason: null,
}

describe('A finding’s prioritization history', () => {
  it('sits folded under the Score, and the reason says nothing of the moves', async () => {
    const { dialog } = await openFinding(JENKINS)

    const folded = within(dialog)
      .getAllByRole('button', { name: /^(How it would be attacked|Vulnerability|Asset|Score|Prioritization history)/ })
      .map((b) => b.textContent?.replace(/\d+$/, ''))
    expect(folded.indexOf('Prioritization history')).toBe(folded.indexOf('Score') + 1)
    const history = within(dialog).getByRole('button', { name: /^Prioritization history/ })
    expect(history).toHaveAttribute('aria-expanded', 'false')
    expect(within(dialog).getByRole('region', { name: 'Why it is here' })).not.toHaveTextContent(/Moved|history/)
  })

  it('lists every change of its place, newest first, with what changed and how a user weighed in', async () => {
    const { user, dialog } = await openFinding(JENKINS)
    const history = await openHistory(user, dialog)

    expect(within(dialog).getByRole('button', { name: /^Prioritization history\s*3$/ })).toBeInTheDocument()
    const entries = within(history)
      .getAllByRole('listitem')
      .filter((li) => li.parentElement?.tagName === 'OL')
    expect(entries).toHaveLength(3)
    expect(entries[0]).toHaveTextContent(MOVED_DOWN)
    expect(entries[0]).toHaveTextContent('The finding did not change; the groups above it did.')
    expect(entries[1]).toHaveTextContent('Moved up from Group 3 to 1')
    expect(entries[2]).toHaveTextContent('Entered the order in Group 3')

    const climb = within(entries[1])
    expect(climb.getByText("Entered CISA's KEV catalog (actively exploited)")).toBeInTheDocument()
    expect(climb.getByText('Band changed: Low → Medium')).toBeInTheDocument()
    expect(climb.getByText('The Score went from 15 to 19')).toBeInTheDocument()
    expect(
      climb.getByText('A user asked to attend it earlier: “ci-01 guarda los secretos de despliegue a producción.”'),
    ).toBeInTheDocument()
    expect(climb.getByText('By Score alone: #15 → #17')).toBeInTheDocument()

    // The newest reason is the one the detail reads first; older ones open on demand.
    expect(within(entries[0]).queryByRole('button', { name: 'Why it was placed there' })).not.toBeInTheDocument()
    expect(climb.queryByText(/sube al primer grupo/)).not.toBeInTheDocument()
    await user.click(climb.getByRole('button', { name: 'Why it was placed there' }))
    expect(climb.getByText(/sube al primer grupo/)).toBeInTheDocument()
    expect(climb.getByText('2024-08-19', { selector: 'mark' })).toBeInTheDocument()

    expect(history).not.toHaveTextContent(/Luna|Prioritizer|Cartógrafo|Editor|Analista|agent|\bAI\b|inferred/i)
  })

  it('tells a round that placed it again in the same group, and what led to it', async () => {
    const { user, dialog } = await openFinding('CVE-2025-1094')
    const history = await openHistory(user, dialog)

    expect(await within(history).findByText('Looked at again; still in Group 2')).toBeInTheDocument()
    expect(within(history).getByText('Looked at again with no identifiable change')).toBeInTheDocument()
  })

  it('shows its reason as plain text, never as markup', async () => {
    answerHistory([
      { ...ENTRY, kind: 'placed_again', group_before: 2, reason: 'Ahora <b>urgente</b>', created_at: '2026-11-11T09:00:00Z' },
      { ...ENTRY, prioritization_id: 'older', reason: '<img src=x onerror=alert(1)>', created_at: '2026-11-10T09:00:00Z' },
    ])
    const { user, dialog } = await openFinding('CVE-2025-1094')
    const history = await openHistory(user, dialog)

    const older = within(history).getAllByRole('button', { name: 'Why it was placed there' })
    await user.click(older[0])
    expect(within(history).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(history.querySelector('img')).toBeNull()
  })

  it('says so when no prioritization has placed it yet', async () => {
    answerHistory([])
    const { user, dialog } = await openFinding(JENKINS)
    const history = await openHistory(user, dialog)

    expect(await within(history).findByText('It is not in the priority order yet.')).toBeInTheDocument()
  })

  it('a history that fails to load leaves the rest of the detail as it is, and can be retried', async () => {
    server.use(http.get(apiUrl('/findings/:id/history'), () => HttpResponse.error()))
    const { user, dialog } = await openFinding(JENKINS)
    const history = await openHistory(user, dialog)

    expect(await within(history).findByText("Couldn't reach the server to load the history.")).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Why it is here' })).toHaveTextContent(/CVE-2024-23897 está en KEV/)

    server.resetHandlers()
    await user.click(within(history).getByRole('button', { name: 'Retry' }))
    expect(await within(history).findByText(MOVED_DOWN)).toBeInTheDocument()
  })

  it('is fetched again after the finding closes, and tells why it left the order', async () => {
    const { user, dialog } = await openFinding('CVE-2024-6387', renderApp('/findings', VIEWER))
    const history = await openHistory(user, dialog)
    expect(await within(history).findByText('Entered the order in Group 2')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close finding' }))
    const close = await screen.findByRole('dialog', { name: 'Close CVE-2024-6387' })
    await user.click(within(close).getByRole('radio', { name: 'False positive / does not apply' }))
    await user.type(within(close).getByLabelText('Why'), 'Lab only.')
    await user.click(within(close).getByRole('button', { name: 'Close finding' }))

    expect(await within(history).findByText('Left the priority order')).toBeInTheDocument()
    expect(within(history).getByText('Closed: False positive / does not apply')).toBeInTheDocument()
  })

  it('is fetched again after a user says it should be attended earlier', async () => {
    const requests = countHistoryRequests()
    const { user, dialog } = await openFinding('CVE-2024-6387', renderApp('/findings', VIEWER))
    await within(dialog).findByRole('button', { name: /^Prioritization history\s*1$/ })
    const before = requests.value

    await user.click(within(dialog).getByRole('button', { name: 'Should be attended earlier' }))
    await user.type(within(dialog).getByLabelText('Why'), 'Corre la nómina.')
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    expect(await within(dialog).findByText('Saved.')).toBeInTheDocument()
    await expect.poll(() => requests.value).toBeGreaterThan(before)
  })

  it('answers 400 for an id that is not a UUID, before looking for the finding', async () => {
    const response = await fetch(apiUrl('/findings/not-a-uuid/history'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid_request' })

    const missing = await fetch(apiUrl('/findings/00000000-0000-4000-8000-000000000000/history'))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ code: 'finding_not_found' })
  })
})
