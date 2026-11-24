import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ClosedFinding } from '../../api/findingCloses'
import { closedFindingsStore } from '../../mocks/closed-findings-store'
import { failure } from '../../mocks/handlers/responses'
import { prioritizationsStore } from '../../mocks/prioritizations-store'
import { apiUrl } from '../../mocks/url'
import { onPhone, renderApp } from '../../test/render'
import { server } from '../../test/server'

const BASE = {
  asset_id: 1,
  asset_name: 'pg-prod-01',
  vendor: 'postgresql',
  product: 'postgresql',
  component_name: 'PostgreSQL',
  component_version: '15.6',
  closed_by: 'ana@acme.example',
  closed_at: '2026-11-10T15:00:00Z',
}

const AHEAD: ClosedFinding = {
  ...BASE,
  id: 'f-ahead',
  cve_id: 'CVE-2025-1094',
  reason: 'accepted_risk',
  note: 'Behind the WAF.',
  reopen_at: '2099-03-01T00:00:00-06:00',
}

const PAST: ClosedFinding = {
  ...BASE,
  id: 'f-past',
  cve_id: 'CVE-2024-6387',
  reason: 'postponed',
  note: 'Next sprint.',
  reopen_at: '2026-01-01T00:00:00-06:00',
}

const FOR_GOOD: ClosedFinding = {
  ...BASE,
  id: 'f-good',
  cve_id: 'CVE-2024-23897',
  reason: 'false_positive',
  note: 'Lab only.',
  reopen_at: null,
}

async function openClosedTab() {
  const user = renderApp('/findings?tab=closed')
  await screen.findByRole('tab', { name: 'Manual closures', selected: true })
  return user
}

function rowOf(cve: string) {
  return screen.getByText(cve).closest('tr')!
}

describe('Closed tab', () => {
  it('says when no finding was closed by hand', async () => {
    await openClosedTab()

    expect(await screen.findByText('No findings closed by hand')).toBeInTheDocument()
  })

  it('lists each finding closed by hand with why, who and when it may reopen', async () => {
    closedFindingsStore.save([AHEAD, PAST, FOR_GOOD])
    await openClosedTab()

    await screen.findByText('CVE-2025-1094')
    const ahead = within(rowOf('CVE-2025-1094'))
    expect(ahead.getByText('Accepted risk')).toBeInTheDocument()
    expect(ahead.getByText('Behind the WAF.')).toBeInTheDocument()
    expect(ahead.getByText('ana@acme.example')).toBeInTheDocument()
    expect(ahead.getByText(/2099/)).toBeInTheDocument()

    expect(within(rowOf('CVE-2024-6387')).getByText('Will reopen at the next sync')).toBeInTheDocument()

    const forGood = within(rowOf('CVE-2024-23897'))
    expect(forGood.getByText('False positive / does not apply')).toBeInTheDocument()
    expect(forGood.queryByText(/reopen/i, { selector: 'td' })).not.toBeInTheDocument()
  })

  it('reopens a finding from its row once confirmed', async () => {
    const [newest, ...older] = prioritizationsStore.load()
    const finding = newest.findings.find((f) => f.cve_id === FOR_GOOD.cve_id)!
    const findings = newest.findings.map((f) => (f === finding ? { ...f, closed_at: BASE.closed_at, current: null } : f))
    prioritizationsStore.save([{ ...newest, findings }, ...older])
    closedFindingsStore.save([{ ...FOR_GOOD, id: finding.finding_id }])
    const user = await openClosedTab()

    await user.click(await screen.findByRole('button', { name: 'Reopen CVE-2024-23897' }))
    const confirm = await screen.findByRole('dialog', { name: 'Reopen CVE-2024-23897?' })
    await user.click(within(confirm).getByRole('button', { name: 'Yes, reopen' }))

    expect(await screen.findByText('No findings closed by hand')).toBeInTheDocument()
  })

  it('says a finding closed on its own reopens only on its own', async () => {
    closedFindingsStore.save([FOR_GOOD])
    server.use(
      http.post(apiUrl('/findings/:id/reopen'), () =>
        failure(409, 'finding_not_closed_by_hand', 'finding is not closed by hand'),
      ),
    )
    const user = await openClosedTab()

    await user.click(await screen.findByRole('button', { name: 'Reopen CVE-2024-23897' }))
    const confirm = await screen.findByRole('dialog', { name: 'Reopen CVE-2024-23897?' })
    await user.click(within(confirm).getByRole('button', { name: 'Yes, reopen' }))

    expect(
      await within(confirm).findByText(
        'This finding closed automatically. It reopens if it shows up again.',
      ),
    ).toBeInTheDocument()
  })

  it('on a phone shows each closed finding as a card', async () => {
    onPhone()
    closedFindingsStore.save([AHEAD])
    await openClosedTab()

    const card = (await screen.findByText('CVE-2025-1094')).closest('li')!
    expect(within(card).getByText('Accepted risk')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Reopen CVE-2025-1094' })).toBeInTheDocument()
  })
})
