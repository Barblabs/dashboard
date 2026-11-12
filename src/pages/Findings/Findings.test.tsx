import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { failure } from '../../mocks/handlers/responses'
import { prioritizationsStore } from '../../mocks/prioritizations-store'
import { apiUrl } from '../../mocks/url'
import { renderApp, VIEWER } from '../../test/render'
import { server } from '../../test/server'

async function renderFindings(path = '/findings') {
  const user = renderApp(path)
  await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })
  return user
}

function rowOf(cve: string) {
  return screen.getByRole('button', { name: `Open ${cve}` }).closest('tr')!
}

async function openFinding(user: ReturnType<typeof renderApp>, cve: string) {
  await user.click(screen.getByRole('button', { name: `Open ${cve}` }))
  return screen.findByRole('dialog', { name: cve })
}

describe('Findings', () => {
  it('shows the newest order in groups, the first to attend first', async () => {
    await renderFindings()

    const groups = within(screen.getByRole('main')).getAllByRole('region')
    expect(groups.map((g) => within(g).getByRole('heading').textContent)).toEqual([
      'Explotadas por ransomware en el servidor web expuesto',
      'Explotada por ransomware, en un activo interno de laboratorio',
      'Alta probabilidad de explotación en el servidor de pagos',
    ])
    expect(within(groups[0]!).getByRole('button', { name: 'Open CVE-2021-41773' })).toBeInTheDocument()
    expect(within(groups[2]!).getByText(/Se suma CVE-2024-6387/)).toBeInTheDocument()
    expect(screen.getByText(/5 findings, 3 groups/)).toBeInTheDocument()
    expect(screen.getByText('Weighed with business context v1')).toBeInTheDocument()
  })

  it('marks what the latest round placed, what KEV lists and what has a plan', async () => {
    await renderFindings()

    expect(within(rowOf('CVE-2024-6387')).getByText('New')).toBeInTheDocument()
    expect(within(rowOf('CVE-2025-1094')).queryByText('New')).not.toBeInTheDocument()
    expect(within(rowOf('CVE-2024-23897')).getByText('Ransomware')).toBeInTheDocument()
    expect(within(rowOf('CVE-2024-23897')).getByText('Plan')).toBeInTheDocument()
    expect(within(rowOf('CVE-2025-1094')).queryByText('KEV')).not.toBeInTheDocument()
  })

  it('opens a finding with everything known of it', async () => {
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')

    expect(window.location.search).toContain('finding=')
    expect(within(dialog).getByText(/Improper neutralization of quoting syntax in PostgreSQL libpq/)).toBeInTheDocument()
    expect(within(dialog).getByText(/CVE-2025-1094 tiene EPSS 0.9003/)).toBeInTheDocument()
    expect(within(dialog).getByText(/\/asset\/critical_services\/0\/name =/)).toBeInTheDocument()
    expect(within(dialog).getAllByText('Pagos en línea')).toHaveLength(2)
    expect(within(dialog).getByText('Critical impact · Tolerates 1–4 hours')).toBeInTheDocument()
    expect(within(dialog).getByText('T1190')).toBeInTheDocument()
    expect(within(dialog).getByText('M1051')).toBeInTheDocument()
    expect(within(dialog).getByText(/Inferred by the Cartógrafo/)).toBeInTheDocument()
    expect(within(dialog).getByText('Not in KEV')).toBeInTheDocument()
    expect(within(dialog).getByText(/Probability 0.9003/)).toBeInTheDocument()
    expect(within(dialog).getByText('By Score alone it would be #4.')).toBeInTheDocument()
    expect(within(dialog).getByText('No action plan yet. Luna writes one from what is known of this finding.')).toBeInTheDocument()
  })

  it('opens the finding a link names', async () => {
    const id = prioritizationsStore.load()[0]!.findings.find((f) => f.cve_id === 'CVE-2024-23897')!.finding_id
    renderApp(`/findings?finding=${id}`)

    const dialog = await screen.findByRole('dialog', { name: 'CVE-2024-23897' })

    expect(within(dialog).getByText('2.442')).toBeInTheDocument()
    expect(within(dialog).getByText('Actualiza Jenkins a 2.442.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Written by Luna/)).toBeInTheDocument()
  })

  it('asks Luna for an action plan and keeps it with the finding', async () => {
    const user = await renderFindings()
    let dialog = await openFinding(user, 'CVE-2025-1094')

    await user.click(within(dialog).getByRole('button', { name: 'Ask Luna for an action plan' }))

    expect(await within(dialog).findByText('CVE-2025-1094 afecta PostgreSQL 15.6 en pg-prod-01.')).toBeInTheDocument()
    expect(within(dialog).getByText(/M1051 · T1190/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(rowOf('CVE-2025-1094')).getByText('Plan')).toBeInTheDocument()
    dialog = await openFinding(user, 'CVE-2025-1094')
    expect(within(dialog).getByRole('button', { name: 'Ask for a new plan' })).toBeInTheDocument()
  })

  it('says why Luna gave no plan', async () => {
    server.use(http.post(apiUrl('/prioritizations/:id/plans'), () => failure(502, 'agent_refused', 'the agent declined to answer')))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')

    await user.click(within(dialog).getByRole('button', { name: 'Ask Luna for an action plan' }))

    expect(await within(dialog).findByText('Luna declined to write a plan for this finding.')).toBeInTheDocument()
  })

  it('records what a viewer says about where a finding should be', async () => {
    const user = renderApp('/findings', VIEWER)
    await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })
    const dialog = await openFinding(user, 'CVE-2024-6387')

    await user.selectOptions(within(dialog).getByLabelText('What do you say?'), 'should_be_earlier')
    await user.type(within(dialog).getByLabelText('Why'), 'Corre la nómina.')
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    expect(await within(dialog).findByText('Saved.')).toBeInTheDocument()
    expect(within(dialog).getByText('Should be attended earlier', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText('Corre la nómina.')).toBeInTheDocument()
    expect(prioritizationsStore.load()[0]!.feedback).toHaveLength(1)
  })

  it('says there is nothing yet before the first prioritization', async () => {
    prioritizationsStore.save([])
    renderApp('/findings')

    expect(await screen.findByText(/No findings yet/)).toBeInTheDocument()
  })
})
