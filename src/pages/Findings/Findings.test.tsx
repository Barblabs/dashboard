import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Finding } from '../../api/prioritizations'
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

/** Changes one Finding of the newest stored Prioritization, before the app reads it. */
function storeFinding(cve: string, change: (finding: Finding) => Finding) {
  const [newest, ...older] = prioritizationsStore.load()
  const findings = newest.findings.map((f) => (f.cve_id === cve ? change(f) : f))
  prioritizationsStore.save([{ ...newest, findings }, ...older])
}

async function openFinding(user: ReturnType<typeof renderApp>, cve: string) {
  await user.click(screen.getByRole('button', { name: `Open ${cve}` }))
  return screen.findByRole('dialog', { name: cve })
}

async function openSummaryTab() {
  const user = renderApp('/findings')
  await user.click(await screen.findByRole('tab', { name: 'Summary' }))
  return user
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
    expect(within(groups[0]).getByRole('button', { name: 'Open CVE-2021-41773' })).toBeInTheDocument()
    expect(within(groups[2]).getByText(/Se suma CVE-2024-6387/)).toBeInTheDocument()
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
    const reason = within(dialog).getByRole('region', { name: 'Why it is here' })
    expect(reason).toHaveTextContent(/CVE-2025-1094 tiene EPSS 0.9003/)
    // The values its evidence cites are marked where the reason names them.
    expect(within(reason).getByText('0.9003', { selector: 'mark' })).toBeInTheDocument()
    expect(within(reason).getByTitle('/asset/critical_services/0/name')).toHaveTextContent('Critical servicePagos en línea')
    expect(within(dialog).getByText('Critical impact · Tolerates 1–4 hours')).toBeInTheDocument()
    expect(within(dialog).getByText('T1190')).toBeInTheDocument()
    expect(within(dialog).getByText(/Inferred by the Cartógrafo/)).toBeInTheDocument()
    expect(within(dialog).queryByText('M1051')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Source quote · 1 MITRE mitigation' }))
    expect(within(dialog).getByText('M1051')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Not in KEV').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('90.03% chance of exploitation in the next 30 days')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /postgresql\.org/ })).toHaveAttribute(
      'href',
      'https://www.postgresql.org/support/security/CVE-2025-1094/',
    )
    expect(within(dialog).getByText('By Score alone it would be #4.')).toBeInTheDocument()
    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Production$/)
    expect(within(dialog).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^1$/)
    expect(within(dialog).getByText('Measured: no input was missing.')).toBeInTheDocument()
    expect(within(dialog).getByText('No action plan yet. Luna writes one from what is known of this finding.')).toBeInTheDocument()
    const refLink = within(dialog).getByRole('link', { name: /postgresql\.org\/support\/security\/CVE-2025-1094/ })
    expect(refLink).toHaveAttribute('target', '_blank')
    expect(refLink).toHaveAttribute('rel', 'noreferrer')
  })

  it('opens a finding on its Close button, not on the index of its sections', async () => {
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')

    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus())
  })

  it('marks whole evidence values only, never a value inside a longer word', async () => {
    const [newest, ...older] = prioritizationsStore.load()
    const groups = newest.groups.map((g) =>
      g.position === 2 ? { ...g, reason: 'Va después porque lab-01 es de criticidad low, y no hay que follow nada.' } : g,
    )
    prioritizationsStore.save([{ ...newest, groups }, ...older])
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2024-23897')

    const reason = within(dialog).getByRole('region', { name: 'Why it is here' })
    expect(within(reason).getAllByText('low', { selector: 'mark' })).toHaveLength(1)
  })

  it('shows an EPSS close to 1 without rounding it up to a certain 100%', async () => {
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2024-23897')

    // EPSS 0.99999 in the mock.
    expect(within(dialog).getByText('99.99% chance of exploitation in the next 30 days')).toBeInTheDocument()
    expect(within(dialog).queryByText(/^100%/)).not.toBeInTheDocument()
  })

  it('links only http and https references', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      details: { ...f.details, references: ['javascript:alert(1)', 'https://example.com/advisory'] },
    }))
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')

    expect(within(dialog).getByText('javascript:alert(1)').closest('a')).toBeNull()
    expect(within(dialog).getByRole('link', { name: /example\.com/ })).toHaveAttribute('href', 'https://example.com/advisory')
  })

  it('keeps a long list of references behind a toggle', async () => {
    const references = Array.from({ length: 12 }, (_, i) => `https://example.com/errata/${i}`)
    storeFinding('CVE-2025-1094', (f) => ({ ...f, details: { ...f.details, references } }))
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')
    const links = () => within(dialog).queryAllByRole('link', { name: /example\.com/ })

    expect(links()).toHaveLength(5)
    await user.click(within(dialog).getByRole('button', { name: 'Show all 12 references' }))
    expect(links()).toHaveLength(12)
    await user.click(within(dialog).getByRole('button', { name: 'Show less' }))
    expect(links()).toHaveLength(5)
  })

  it('a finding on an asset of Unknown Lifecycle Stage says its Score is estimated', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      current: {
        asset: { ...f.current!.asset, lifecycle_stage: 'unknown' },
        score_details: { ...f.current!.score_details, data_gaps: ['lifecycle_unknown'] },
      },
    }))
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')

    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Unknown$/)
    expect(within(dialog).getByText('Estimated: some inputs were missing and took a default.')).toBeInTheDocument()
    expect(within(dialog).getByText('Lifecycle Stage unknown')).toBeInTheDocument()
  })

  it('shows the Score as it is now, from 0 to 100', async () => {
    const user = await renderFindings()

    expect(within(rowOf('CVE-2024-23897')).getByText('19')).toBeInTheDocument()

    const dialog = await openFinding(user, 'CVE-2024-23897')

    expect(within(dialog).getByText('19')).toBeInTheDocument()
    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Implementation$/)
    expect(within(dialog).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^0.8$/)
    // The order stays the snapshot's.
    expect(within(dialog).getByText('By Score alone it would be #5.')).toBeInTheDocument()
  })

  it('a closed finding shows its Score and Asset as they were placed', async () => {
    storeFinding('CVE-2024-23897', (f) => ({ ...f, closed_at: '2026-11-12T10:00:00Z', current: null }))
    const user = await renderFindings()

    expect(within(rowOf('CVE-2024-23897')).getByText('24')).toBeInTheDocument()
    const dialog = await openFinding(user, 'CVE-2024-23897')

    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Production$/)
    expect(within(dialog).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^1$/)
  })

  it('a multiplier of 0 is still shown', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      current: { ...f.current!, score_details: { ...f.current!.score_details, lifecycle_multiplier: 0 } },
    }))
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')

    expect(within(dialog).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^0$/)
  })

  it('a Scoring Model 3 Score shows its Band, its Exploit Signal and its classification multiplier', async () => {
    const user = await renderFindings()

    expect(within(rowOf('CVE-2021-41773')).getByText('Critical')).toBeInTheDocument()
    const dialog = await openFinding(user, 'CVE-2021-41773')

    expect(within(dialog).getByText('Critical')).toBeInTheDocument()
    expect(within(dialog).getByText('Exploit signal').nextElementSibling).toHaveTextContent(/^100%$/)
    expect(within(dialog).getByText('Classification multiplier').nextElementSibling).toHaveTextContent(/^1$/)
    expect(within(dialog).getByText('Information Classification').nextElementSibling).toHaveTextContent(/^Confidential$/)
  })

  it('shows the Band the backend gave, not one read from the value', async () => {
    storeFinding('CVE-2021-41773', (f) => ({
      ...f,
      current: { ...f.current!, score_details: { ...f.current!.score_details, band: 'medium' } },
    }))
    await renderFindings()

    expect(within(rowOf('CVE-2021-41773')).getByText('Medium')).toBeInTheDocument()
    expect(within(rowOf('CVE-2021-41773')).queryByText('Critical')).not.toBeInTheDocument()
  })

  it('a Score from before Scoring Model 3 has no Band, and its newer factors say they are not in its model', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      current: { ...f.current!, score_details: { ...f.current!.score_details, scoring_model: 2 } },
    }))
    const user = await renderFindings()

    for (const band of ['Critical', 'High', 'Medium', 'Low']) {
      expect(within(rowOf('CVE-2025-1094')).queryByText(band)).not.toBeInTheDocument()
    }
    const dialog = await openFinding(user, 'CVE-2025-1094')

    expect(within(dialog).getByText('Exploit signal').nextElementSibling).toHaveTextContent(/^Not in this model$/)
    expect(within(dialog).getByText('Classification multiplier').nextElementSibling).toHaveTextContent(
      /^Not in this model$/,
    )
  })

  it('an Unclassified asset shows as pending, never as Public, and its multiplier says why it has none', async () => {
    storeFinding('CVE-2021-41773', (f) => ({
      ...f,
      current: {
        asset: { ...f.current!.asset, information_classification: 'unclassified' },
        score_details: {
          ...f.current!.score_details,
          information_classification_multiplier: null,
          data_gaps: ['information_classification_undeclared'],
        },
      },
    }))
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2021-41773')

    const classification = within(dialog).getByText('Information Classification').nextElementSibling
    if (!(classification instanceof HTMLElement)) throw new Error('no value next to Information Classification')
    expect(classification).toHaveTextContent(/^Unclassified$/)
    expect(
      within(classification).getByTitle("No one has declared it; it doesn't count toward the Score."),
    ).toBeInTheDocument()
    expect(within(dialog).queryByText('Public')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Classification multiplier').nextElementSibling).toHaveTextContent(/^Unclassified$/)
    expect(within(dialog).getByText('Estimated: some inputs were missing and took a default.')).toBeInTheDocument()
    expect(within(dialog).getByText('Information Classification undeclared')).toBeInTheDocument()
  })

  it('opens the finding a link names', async () => {
    const id = prioritizationsStore.load()[0].findings.find((f) => f.cve_id === 'CVE-2024-23897')!.finding_id
    renderApp(`/findings?finding=${id}`)

    const dialog = await screen.findByRole('dialog', { name: 'CVE-2024-23897' })

    expect(within(dialog).getByText('2.442')).toBeInTheDocument()
    expect(within(dialog).getByText('Actualiza Jenkins a 2.442.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Written by Luna/)).toBeInTheDocument()
    const sourceLinks = within(dialog).getAllByRole('link', { name: /packetstormsecurity\.com/ })
    expect(sourceLinks[0]).toHaveAttribute('target', '_blank')
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
    expect(prioritizationsStore.load()[0].feedback).toHaveLength(1)
  })

  it('shows the too-long error on the note field when it exceeds 2000 characters', async () => {
    const user = renderApp('/findings', VIEWER)
    await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })
    const dialog = await openFinding(user, 'CVE-2024-6387')

    fireEvent.change(within(dialog).getByLabelText('Why'), { target: { value: 'a'.repeat(2001) } })
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    const noteField = within(dialog).getByLabelText('Why')
    expect(noteField).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('The note can have up to 2000 characters.')).toBeInTheDocument()
  })

  it('says there is nothing yet before the first prioritization', async () => {
    prioritizationsStore.save([])
    renderApp('/findings')

    expect(await screen.findByText(/No findings yet/)).toBeInTheDocument()
  })

  describe('tabs', () => {
    it('renders all 5 tabs on the Findings page', async () => {
      renderApp('/findings')
      const tablist = await screen.findByRole('tablist')
      const tabs = within(tablist).getAllByRole('tab')
      expect(tabs.map((t) => t.textContent)).toEqual([
        'Prioritized list',
        'Summary',
        'Before & After',
        'Where the risk is',
        'Threats',
      ])
    })

    it('shows the prioritized list by default and switches to Summary', async () => {
      const user = renderApp('/findings')
      await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })

      await user.click(screen.getByRole('tab', { name: 'Summary' }))

      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true')
      expect(await screen.findByText('Weekly trend')).toBeInTheDocument()
    })
  })

  describe('summary tab', () => {
    it('shows the weekly trend chart heading and time-to-close heading', async () => {
      await openSummaryTab()

      expect(await screen.findByText('Weekly trend')).toBeInTheDocument()
      expect(await screen.findByText('Time to close by band')).toBeInTheDocument()
    })

    it('shows time-to-close bars for all five bands', async () => {
      await openSummaryTab()

      // Each bar has a unique day value rendered as text to its right.
      expect(await screen.findByText('3.5 days')).toBeInTheDocument() // critical
      expect(screen.getByText('7.2 days')).toBeInTheDocument()         // high
      expect(screen.getByText('14.1 days')).toBeInTheDocument()        // medium
      expect(screen.getByText('30.5 days')).toBeInTheDocument()        // low
      expect(screen.getByText('45.0 days')).toBeInTheDocument()        // unbanded
    })

    it('labels the critical bar with its band name and median days', async () => {
      await openSummaryTab()

      expect(await screen.findByRole('img', { name: 'Critical: 3.5 days' })).toBeInTheDocument()
    })
  })

  describe('summary indicators', () => {
    it('shows the 5 indicator cards above the tabs and keeps them on other tabs', async () => {
      const user = renderApp('/findings')

      // Indicators are always visible; wait for the query to resolve.
      expect(await screen.findByText('23')).toBeInTheDocument()
      expect(screen.getByText('In KEV')).toBeInTheDocument()
      expect(screen.getByText('Critical on internet-facing')).toBeInTheDocument()

      // Switch to a different tab — indicators must remain visible.
      await user.click(await screen.findByRole('tab', { name: 'Summary' }))
      expect(screen.getByText('23')).toBeInTheDocument()
      expect(screen.getByText('In KEV')).toBeInTheDocument()
    })
  })

  describe('filters', () => {
    it('filters by band and hides empty groups', async () => {
      await renderFindings()

      const bandSelect = screen.getByRole('combobox', { name: 'Band' })
      fireEvent.change(bandSelect, { target: { value: 'critical' } })

      await waitFor(() => {
        const groups = within(screen.getByRole('main')).queryAllByRole('region')
        expect(groups.length).toBeGreaterThan(0)
        groups.forEach((g) => {
          expect(within(g).queryAllByRole('button', { name: /^Open/ }).length).toBeGreaterThan(0)
        })
      })
      expect(window.location.search).toContain('band=critical')
    })

    it('shows no-results message when no findings match the filter', async () => {
      await renderFindings()

      fireEvent.change(screen.getByRole('combobox', { name: 'Band' }), {
        target: { value: 'unbanded' },
      })

      expect(await screen.findByText('No findings match the active filters.')).toBeInTheDocument()
    })

    it('shows a chip for the active band filter and removes it', async () => {
      const user = renderApp('/findings?band=critical')
      await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })

      expect(screen.getByText('Band: Critical')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remove filter' }))

      await waitFor(() => expect(screen.queryByText('Band: Critical')).not.toBeInTheDocument())
    })

    it('shows "From the chart:" prefix when navigated with from=chart', async () => {
      renderApp('/findings?band=critical&from=chart')
      await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })

      expect(screen.getByText('From the chart:')).toBeInTheDocument()
      expect(screen.getByText('Band: Critical')).toBeInTheDocument()
    })

    it('removes the from=chart label when all chips are cleared', async () => {
      const user = renderApp('/findings?band=critical&from=chart')
      await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })

      await user.click(screen.getByRole('button', { name: 'Remove filter' }))

      await waitFor(() => {
        expect(screen.queryByText('From the chart:')).not.toBeInTheDocument()
        expect(screen.queryByText('Band: Critical')).not.toBeInTheDocument()
      })
    })

    it('clears all filters with the clear-all button', async () => {
      const user = renderApp('/findings?band=critical&kev=1')
      await screen.findByRole('region', { name: 'Explotadas por ransomware en el servidor web expuesto' })

      // Both the chip label ("Band: Critical") and the KEV chip are shown;
      // "KEV only" appears twice: once in the checkbox label, once in the chip.
      expect(screen.getByText('Band: Critical')).toBeInTheDocument()
      expect(screen.getAllByText('KEV only')).toHaveLength(2)

      await user.click(screen.getByRole('button', { name: 'Clear all' }))

      await waitFor(() => {
        expect(screen.queryByText('Band: Critical')).not.toBeInTheDocument()
        // After clearing, only the checkbox label "KEV only" remains (no chip).
        expect(screen.getAllByText('KEV only')).toHaveLength(1)
      })
    })
  })
})
