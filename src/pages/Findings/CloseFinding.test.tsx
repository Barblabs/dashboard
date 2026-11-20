import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Finding } from '../../api/prioritizations'
import { closedFindingsStore } from '../../mocks/closed-findings-store'
import { failure } from '../../mocks/handlers/responses'
import { prioritizationsStore } from '../../mocks/prioritizations-store'
import { apiUrl } from '../../mocks/url'
import { renderApp, VIEWER } from '../../test/render'
import { holdRequests, server } from '../../test/server'

const CVE = 'CVE-2024-6387'

/** Changes one Finding of the newest stored Prioritization, before the app reads it. */
function storeFinding(cve: string, change: (finding: Finding) => Finding): Finding {
  const [newest, ...older] = prioritizationsStore.load()
  const findings = newest.findings.map((f) => (f.cve_id === cve ? change(f) : f))
  prioritizationsStore.save([{ ...newest, findings }, ...older])
  return findings.find((f) => f.cve_id === cve)!
}

/** A Finding a User closed as a false positive, as the store holds it. */
function storeClosedByHand(cve: string) {
  const finding = storeFinding(cve, (f) => ({ ...f, closed_at: '2026-11-10T15:00:00Z', current: null }))
  closedFindingsStore.save([
    {
      id: finding.finding_id,
      cve_id: cve,
      asset_id: 1,
      asset_name: finding.asset_name,
      vendor: '',
      product: '',
      component_name: finding.component,
      component_version: finding.version,
      note: 'Lab only.',
      closed_at: '2026-11-10T15:00:00Z',
      closed_by: 'ana@acme.example',
      reason: 'false_positive',
      reopen_at: null,
    },
  ])
}

async function openFinding(cve = CVE, user = renderApp(`/findings`)) {
  await user.click(await screen.findByRole('button', { name: `Open ${cve}` }))
  return { user, dialog: await screen.findByRole('dialog', { name: cve }) }
}

describe('Closing a finding by hand', () => {
  it('is offered from Feedback, for what does not apply or is already fixed', async () => {
    const { user, dialog } = await openFinding()

    await user.click(within(dialog).getByRole('button', { name: 'Close the finding' }))

    expect(await screen.findByRole('dialog', { name: `Close ${CVE}` })).toBeInTheDocument()
  })

  it('asks for a day only for a close that lasts until one, and says what each reason leads to', async () => {
    const { user, dialog } = await openFinding()

    await user.click(within(dialog).getByRole('button', { name: 'Close finding' }))
    const close = await screen.findByRole('dialog', { name: `Close ${CVE}` })

    expect(within(close).getByRole('radio', { name: 'Already remediated' })).toHaveAccessibleDescription(
      'If the next Sync still sees a vulnerable version, it reopens on its own.',
    )
    expect(within(close).queryByLabelText('Reopens after')).not.toBeInTheDocument()

    await user.click(within(close).getByRole('radio', { name: 'Accepted risk' }))
    expect(within(close).getByLabelText('Reopens after')).toBeInTheDocument()

    await user.click(within(close).getByRole('radio', { name: 'False positive / does not apply' }))
    expect(within(close).queryByLabelText('Reopens after')).not.toBeInTheDocument()
  })

  it('closes a finding as postponed, and it counts as closed at once', async () => {
    const { user, dialog } = await openFinding(CVE, renderApp('/findings', VIEWER))
    expect(await screen.findByText('23')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close finding' }))
    const close = await screen.findByRole('dialog', { name: `Close ${CVE}` })
    await user.click(within(close).getByRole('radio', { name: 'Postponed' }))
    const submit = within(close).getByRole('button', { name: 'Close finding' })
    expect(submit).toBeDisabled()

    await user.type(within(close).getByLabelText('Why'), 'Next maintenance window.')
    await user.click(submit)
    expect(await within(close).findByText('Choose the day it may reopen.')).toBeInTheDocument()

    await user.click(within(close).getByRole('button', { name: 'In 30 days' }))
    await user.click(submit)

    expect(await within(dialog).findByRole('button', { name: 'Reopen' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: `Close ${CVE}` })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Postponed')).toBeInTheDocument()
    expect(within(dialog).getByText('Next maintenance window.')).toBeInTheDocument()
    expect(within(dialog).getByText(/^Closed by viewer@barbattack\.example on/)).toBeInTheDocument()
    expect(within(dialog).getByText(/^Reopens after/)).toBeInTheDocument()
    expect(await screen.findByText('22')).toBeInTheDocument()

    const [stored] = closedFindingsStore.load()
    expect(stored).toMatchObject({ cve_id: CVE, reason: 'postponed' })
    expect(new Date(stored.reopen_at!).getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000)
  })

  it('stays pending until the finding shows as closed, so it is never offered to close twice', async () => {
    const { user, dialog } = await openFinding()
    await user.click(within(dialog).getByRole('button', { name: 'Close finding' }))
    const close = await screen.findByRole('dialog', { name: `Close ${CVE}` })
    await user.type(within(close).getByLabelText('Why'), 'Patched to 9.8.')

    const release = holdRequests('get', '/prioritizations/:id')
    await user.click(within(close).getByRole('button', { name: 'Close finding' }))
    await waitFor(() => expect(closedFindingsStore.load()).toHaveLength(1))

    expect(within(close).getByRole('button', { name: 'Close finding' })).toHaveAttribute('aria-busy', 'true')
    release()
    expect(await within(dialog).findByRole('button', { name: 'Reopen' })).toBeInTheDocument()
  })

  it('turns away a day that is not ahead', async () => {
    const { user, dialog } = await openFinding()

    await user.click(within(dialog).getByRole('button', { name: 'Close finding' }))
    const close = await screen.findByRole('dialog', { name: `Close ${CVE}` })
    await user.click(within(close).getByRole('radio', { name: 'Accepted risk' }))
    fireEvent.change(within(close).getByLabelText('Reopens after'), { target: { value: '2020-01-01' } })
    await user.type(within(close).getByLabelText('Why'), 'Behind the WAF.')
    await user.click(within(close).getByRole('button', { name: 'Close finding' }))

    expect(await within(close).findByText('Choose a day after today.')).toBeInTheDocument()
    expect(closedFindingsStore.load()).toEqual([])
  })

  it('says the finding was already closed when someone closed it first', async () => {
    server.use(http.post(apiUrl('/findings/:id/close'), () => failure(409, 'finding_closed', 'finding is already closed')))
    const { user, dialog } = await openFinding()

    await user.click(within(dialog).getByRole('button', { name: 'Close finding' }))
    const close = await screen.findByRole('dialog', { name: `Close ${CVE}` })
    await user.type(within(close).getByLabelText('Why'), 'Patched to 9.8.')
    await user.click(within(close).getByRole('button', { name: 'Close finding' }))

    expect(
      await within(close).findByText('This finding was already closed. The list is up to date now.'),
    ).toBeInTheDocument()
  })
})

describe('Reopening a finding', () => {
  it('reopens a finding closed by hand once confirmed', async () => {
    storeClosedByHand(CVE)
    const { user, dialog } = await openFinding()
    expect(await within(dialog).findByText('Lab only.')).toBeInTheDocument()
    expect(within(dialog).getByText('False positive / does not apply')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Reopen' }))
    const confirm = await screen.findByRole('dialog', { name: `Reopen ${CVE}?` })
    await user.click(within(confirm).getByRole('button', { name: 'Yes, reopen' }))

    expect(await within(dialog).findByRole('button', { name: 'Close finding' })).toBeInTheDocument()
    expect(within(dialog).queryByText('Lab only.')).not.toBeInTheDocument()
    expect(closedFindingsStore.load()).toEqual([])
  })

  it('offers no reopen for a finding that closed on its own', async () => {
    storeFinding(CVE, (f) => ({ ...f, closed_at: '2026-11-12T10:00:00Z', current: null }))
    const { dialog } = await openFinding()

    expect(
      await within(dialog).findByText(
        'This finding closed automatically; it will reopen on its own if it shows up again.',
      ),
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Close finding' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Close the finding' })).not.toBeInTheDocument()
  })
})
