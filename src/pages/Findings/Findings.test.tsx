import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Finding } from '../../api/prioritizations'
import { failure } from '../../mocks/handlers/responses'
import { prioritizationsStore } from '../../mocks/prioritizations-store'
import { apiUrl } from '../../mocks/url'
import { onPhone, renderApp, seedSource, VIEWER } from '../../test/render'
import { holdRequests, server } from '../../test/server'

async function renderFindings(path = '/findings') {
  const user = renderApp(path)
  await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })
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

/** Unfolds one of the detail's technical sections, which start folded, and returns it. */
async function openSection(user: ReturnType<typeof renderApp>, dialog: HTMLElement, name: string) {
  const title = new RegExp(`^${name}`)
  await user.click(within(dialog).getByRole('button', { name: title }))
  return within(dialog).getByRole('region', { name: title })
}

async function openSummaryTab() {
  const user = renderApp('/findings')
  await user.click(await screen.findByRole('tab', { name: 'Summary' }))
  return user
}

async function openBeforeAfterTab() {
  const user = renderApp('/findings')
  await user.click(await screen.findByRole('tab', { name: 'Before & After' }))
  return user
}

async function openRiskTab() {
  const user = renderApp('/findings')
  await user.click(await screen.findByRole('tab', { name: 'Where the risk is' }))
  return user
}

async function openThreatsTab() {
  const user = renderApp('/findings')
  await user.click(await screen.findByRole('tab', { name: 'Threats' }))
  return user
}

describe('Findings', () => {
  it('shows the newest order in groups, the first to attend first', async () => {
    await renderFindings()

    const groups = within(screen.getByRole('main')).getAllByRole('region')
    expect(groups.map((g) => within(g).getByRole('heading').textContent)).toEqual([
      'Fallos con exploit activo sobre servicios expuestos a internet',
      'Explotados activamente, activos internos con servicios de pago y CI/CD',
      'Alta probabilidad de explotación en activos de soporte y cortafuegos perimetrales',
      'Score alto pero sin riesgo inmediato confirmado',
    ])
    expect(within(groups[0]).getByRole('button', { name: 'Open CVE-2021-41773' })).toBeInTheDocument()
    expect(within(groups[2]).getByText(/CVE-2024-21762 y CVE-2024-3400/)).toBeInTheDocument()
    expect(screen.getByText(/20 findings, 4 groups/)).toBeInTheDocument()
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

  it('opens a finding with the reason, the decision and the plan first, and the rest folded', async () => {
    const user = await renderFindings()

    const dialog = await openFinding(user, 'CVE-2025-1094')

    expect(window.location.search).toContain('finding=')
    const reason = within(dialog).getByRole('region', { name: 'Why it is here' })
    expect(reason).toHaveTextContent(/CVE-2025-1094 tiene EPSS 0.9003/)
    // The values its evidence cites are marked where the reason names them, and not listed again.
    expect(within(reason).getByText('0.9003', { selector: 'mark' })).toBeInTheDocument()
    expect(within(reason).queryByRole('list')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Is it in the right place?' })).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        'No action plan yet. Plans are written on their own, in the order of the list; if you do not want to wait, ask for it now.',
      ),
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/Improper neutralization of quoting syntax/)).not.toBeInTheDocument()

    // The rail: what decides how urgent it is.
    expect(within(dialog).getByText('By Score alone it would be #14.')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Not in KEV').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('90.03%')).toBeInTheDocument()
    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Production$/)

    const vulnerability = await openSection(user, dialog, 'Vulnerability')
    expect(within(vulnerability).getByText(/Improper neutralization of quoting syntax in PostgreSQL libpq/)).toBeInTheDocument()
    expect(within(vulnerability).getByText('CVSS 3.1 vector')).toBeInTheDocument()
    const asset = await openSection(user, dialog, 'Asset')
    expect(within(asset).getByText('Critical impact · Tolerates 1–4 hours')).toBeInTheDocument()
    const threats = await openSection(user, dialog, 'How it would be attacked')
    expect(within(threats).getByText('T1190')).toBeInTheDocument()
    expect(within(threats).queryByText('M1051')).not.toBeInTheDocument()
    await user.click(within(threats).getByRole('button', { name: 'Source quote · 1 MITRE mitigation' }))
    expect(within(threats).getByText('M1051')).toBeInTheDocument()
    const score = await openSection(user, dialog, 'Score')
    expect(within(score).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^1$/)
    // Nothing missing, so nothing to warn of.
    expect(within(score).queryByText(/Estimated/)).not.toBeInTheDocument()
    const references = await openSection(user, dialog, 'References')
    const refLink = within(references).getByRole('link', { name: /postgresql\.org\/support\/security\/CVE-2025-1094/ })
    expect(refLink).toHaveAttribute('href', 'https://www.postgresql.org/support/security/CVE-2025-1094/')
    expect(refLink).toHaveAttribute('target', '_blank')
    expect(refLink).toHaveAttribute('rel', 'noreferrer')
  })

  it('never says which agent wrote, labeled or placed something, nor the Scoring Model', async () => {
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')
    for (const name of ['How it would be attacked', 'Vulnerability', 'Asset', 'Score']) await openSection(user, dialog, name)

    expect(dialog).not.toHaveTextContent(/Luna|Prioritizer|Cartógrafo|Editor|Analista|agent|inferred|Scoring Model/i)
  })

  it('opens a finding on its Close button', async () => {
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
    expect(within(dialog).getByText('99.99%')).toBeInTheDocument()
    expect(within(dialog).queryByText(/^100%/)).not.toBeInTheDocument()
  })

  it('spells out the vector of the highest CVSS only, the one the rail scores', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      details: {
        ...f.details,
        cvss: [
          { version: '3.1', base_score: 7.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', type: 'Secondary' },
          { version: '3.1', base_score: 8.1, vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Primary' },
        ],
      },
    }))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')

    const vulnerability = await openSection(user, dialog, 'Vulnerability')

    expect(within(dialog).getByText('8.1')).toBeInTheDocument()
    expect(within(vulnerability).getByText('CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBeInTheDocument()
    expect(within(vulnerability).queryByText(/C:H\/I:N\/A:N/)).not.toBeInTheDocument()
  })

  it("shows CISA's required action only while the Action Plan does not carry it as its mitigation", async () => {
    const user = await renderFindings()

    // The Jenkins plan's mitigation is CISA's required action, word for word.
    let dialog = await openFinding(user, 'CVE-2024-23897')
    let vulnerability = await openSection(user, dialog, 'Vulnerability')
    expect(within(vulnerability).queryByText('Required action')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Until it is fixed')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    dialog = await openFinding(user, 'CVE-2021-41773')
    vulnerability = await openSection(user, dialog, 'Vulnerability')
    expect(within(vulnerability).getByText('Required action')).toBeInTheDocument()
    expect(within(vulnerability).getByText('Apply updates per vendor instructions.')).toBeInTheDocument()
  })

  it('lists under References only what the Action Plan does not cite already', async () => {
    const [newest, ...older] = prioritizationsStore.load()
    const finding = newest.findings.find((f) => f.cve_id === 'CVE-2024-23897')!
    const plan = newest.plans.find((p) => p.finding_id === finding.finding_id)!
    const cited = plan.output.sources[0]
    const findings = newest.findings.map((f) =>
      f === finding ? { ...f, details: { ...f.details, references: [cited, 'https://example.com/advisory'] } } : f,
    )
    prioritizationsStore.save([{ ...newest, findings }, ...older])
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2024-23897')

    const references = await openSection(user, dialog, 'References')

    expect(within(references).getAllByRole('link')).toHaveLength(1)
    expect(within(references).getByRole('link', { name: /example\.com/ })).toBeInTheDocument()
  })

  it('links only http and https references', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      details: { ...f.details, references: ['javascript:alert(1)', 'https://example.com/advisory'] },
    }))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')

    const references = await openSection(user, dialog, 'References')

    expect(within(references).getByText('javascript:alert(1)').closest('a')).toBeNull()
    expect(within(references).getByRole('link', { name: /example\.com/ })).toHaveAttribute('href', 'https://example.com/advisory')
  })

  it('keeps a long list of references behind a toggle', async () => {
    const references = Array.from({ length: 12 }, (_, i) => `https://example.com/errata/${i}`)
    storeFinding('CVE-2025-1094', (f) => ({ ...f, details: { ...f.details, references } }))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')

    const section = await openSection(user, dialog, 'References')
    const links = () => within(section).queryAllByRole('link', { name: /example\.com/ })

    expect(links()).toHaveLength(5)
    await user.click(within(section).getByRole('button', { name: 'Show all 12 references' }))
    expect(links()).toHaveLength(12)
    await user.click(within(section).getByRole('button', { name: 'Show less' }))
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
    const score = await openSection(user, dialog, 'Score')
    expect(within(score).getByText('Estimated: some inputs were missing and took a default.')).toBeInTheDocument()
    expect(within(score).getByText('Lifecycle Stage unknown')).toBeInTheDocument()
  })

  it('shows the Score as it is now, from 0 to 100', async () => {
    const user = await renderFindings()

    expect(within(rowOf('CVE-2024-23897')).getByText('19')).toBeInTheDocument()

    const dialog = await openFinding(user, 'CVE-2024-23897')

    expect(within(dialog).getByText('19')).toBeInTheDocument()
    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Implementation$/)
    // The order stays the snapshot's.
    expect(within(dialog).getByText('By Score alone it would be #17.')).toBeInTheDocument()
    const score = await openSection(user, dialog, 'Score')
    expect(within(score).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^0.8$/)
  })

  it('a closed finding shows its Score and Asset as they were placed', async () => {
    storeFinding('CVE-2024-23897', (f) => ({ ...f, closed_at: '2026-11-12T10:00:00Z', current: null }))
    const user = await renderFindings()

    expect(within(rowOf('CVE-2024-23897')).getByText('24')).toBeInTheDocument()
    const dialog = await openFinding(user, 'CVE-2024-23897')

    expect(within(dialog).getByText('Lifecycle Stage').nextElementSibling).toHaveTextContent(/^Production$/)
    const score = await openSection(user, dialog, 'Score')
    expect(within(score).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^1$/)
  })

  it('a multiplier of 0 is still shown', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      current: { ...f.current!, score_details: { ...f.current!.score_details, lifecycle_multiplier: 0 } },
    }))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')

    const score = await openSection(user, dialog, 'Score')

    expect(within(score).getByText('Lifecycle multiplier').nextElementSibling).toHaveTextContent(/^0$/)
  })

  it('a Scoring Model 3 Score shows its Band, its Exploit Signal and its classification multiplier', async () => {
    const user = await renderFindings()

    expect(within(rowOf('CVE-2021-41773')).getByText('Critical')).toBeInTheDocument()
    const dialog = await openFinding(user, 'CVE-2021-41773')

    expect(within(dialog).getByText('Critical')).toBeInTheDocument()
    expect(within(dialog).getByText('Information Classification').nextElementSibling).toHaveTextContent(/^Confidential$/)
    const score = await openSection(user, dialog, 'Score')
    expect(within(score).getByText('Exploit signal').nextElementSibling).toHaveTextContent(/^100%$/)
    expect(within(score).getByText('Classification multiplier').nextElementSibling).toHaveTextContent(/^1$/)
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

  it('a Score from before Scoring Model 3 has no Band, and its newer factors say they do not apply', async () => {
    storeFinding('CVE-2025-1094', (f) => ({
      ...f,
      current: { ...f.current!, score_details: { ...f.current!.score_details, scoring_model: 2 } },
    }))
    const user = await renderFindings()

    for (const band of ['Critical', 'High', 'Medium', 'Low']) {
      expect(within(rowOf('CVE-2025-1094')).queryByText(band)).not.toBeInTheDocument()
    }
    const dialog = await openFinding(user, 'CVE-2025-1094')

    const score = await openSection(user, dialog, 'Score')
    expect(within(score).getByText('Exploit signal').nextElementSibling).toHaveTextContent(/^Not applicable$/)
    expect(within(score).getByText('Classification multiplier').nextElementSibling).toHaveTextContent(/^Not applicable$/)
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

    expect(within(dialog).getByText('Information Classification').nextElementSibling).toHaveTextContent(/^Unclassified$/)
    const asset = await openSection(user, dialog, 'Asset')
    const classification = within(asset).getByText('Information Classification').nextElementSibling
    if (!(classification instanceof HTMLElement)) throw new Error('no value next to Information Classification')
    expect(classification).toHaveTextContent(/^Unclassified$/)
    expect(
      within(classification).getByTitle("No one has declared it; it doesn't count toward the Score."),
    ).toBeInTheDocument()
    const score = await openSection(user, dialog, 'Score')
    expect(within(dialog).queryByText('Public')).not.toBeInTheDocument()
    expect(within(score).getByText('Classification multiplier').nextElementSibling).toHaveTextContent(/^Unclassified$/)
    expect(within(score).getByText('Estimated: some inputs were missing and took a default.')).toBeInTheDocument()
    expect(within(score).getByText('Information Classification undeclared')).toBeInTheDocument()
  })

  it('on a phone shows each finding as a card that opens when tapped anywhere', async () => {
    onPhone()
    const user = await renderFindings()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const card = screen.getByRole('button', { name: 'Open CVE-2025-1094' }).closest('li')!
    await user.click(within(card).getByText('PostgreSQL 15.6'))

    expect(await screen.findByRole('dialog', { name: 'CVE-2025-1094' })).toBeInTheDocument()
  })

  it('on a phone opens a finding card from the keyboard', async () => {
    onPhone()
    const user = await renderFindings()

    const open = screen.getByRole('button', { name: 'Open CVE-2025-1094' })
    while (document.activeElement !== open) await user.tab()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('dialog', { name: 'CVE-2025-1094' })).toBeInTheDocument()
  })

  it('opens the finding a link names', async () => {
    const id = prioritizationsStore.load()[0].findings.find((f) => f.cve_id === 'CVE-2024-23897')!.finding_id
    renderApp(`/findings?finding=${id}`)

    const dialog = await screen.findByRole('dialog', { name: 'CVE-2024-23897' })

    expect(within(dialog).getByText('2.442')).toBeInTheDocument()
    expect(within(dialog).getByText('Actualiza Jenkins a 2.442.')).toBeInTheDocument()
    expect(within(dialog).getByText(/^Written /)).toBeInTheDocument()
    const sourceLinks = within(dialog).getAllByRole('link', { name: /packetstormsecurity\.com/ })
    expect(sourceLinks[0]).toHaveAttribute('target', '_blank')
  })

  it('gets an action plan and keeps it with the finding', async () => {
    const user = await renderFindings()
    let dialog = await openFinding(user, 'CVE-2025-1094')

    await user.click(within(dialog).getByRole('button', { name: 'Get an action plan' }))

    expect(await within(dialog).findByText('CVE-2025-1094 afecta PostgreSQL 15.6 en pg-prod-01.')).toBeInTheDocument()
    expect(within(dialog).getByText(/M1051 · T1190/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(rowOf('CVE-2025-1094')).getByText('Plan')).toBeInTheDocument()
    dialog = await openFinding(user, 'CVE-2025-1094')
    expect(within(dialog).getByRole('button', { name: 'Ask for a new plan' })).toBeInTheDocument()
  })

  it('says why there is no plan', async () => {
    server.use(http.post(apiUrl('/prioritizations/:id/plans'), () => failure(502, 'agent_refused', 'the agent declined to answer')))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2025-1094')

    await user.click(within(dialog).getByRole('button', { name: 'Get an action plan' }))

    expect(await within(dialog).findByText("A plan can't be written for this finding.")).toBeInTheDocument()
  })

  it('records what a viewer says about where a finding should be', async () => {
    const user = renderApp('/findings', VIEWER)
    await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })
    const dialog = await openFinding(user, 'CVE-2024-6387')

    await user.click(within(dialog).getByRole('button', { name: 'Should be attended earlier' }))
    await user.type(within(dialog).getByLabelText('Why'), 'Corre la nómina.')
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    expect(await within(dialog).findByText('Saved.')).toBeInTheDocument()
    expect(within(dialog).getByText('Should be attended earlier', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText('Corre la nómina.')).toBeInTheDocument()
    expect(prioritizationsStore.load()[0].feedback).toHaveLength(1)
  })

  it('shows the too-long error on the note field when it exceeds 2000 characters', async () => {
    const user = renderApp('/findings', VIEWER)
    await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })
    const dialog = await openFinding(user, 'CVE-2024-6387')

    await user.click(within(dialog).getByRole('button', { name: 'It applies' }))
    fireEvent.change(within(dialog).getByLabelText('Why'), { target: { value: 'a'.repeat(2001) } })
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    const noteField = within(dialog).getByLabelText('Why')
    expect(noteField).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('The note can have up to 2000 characters.')).toBeInTheDocument()
  })

  it('feedback only says where a finding should be', async () => {
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2024-6387')

    const verdicts = within(within(dialog).getByRole('group', { name: 'Is it in the right place?' })).getAllByRole('button')
    expect(verdicts.map((b) => b.textContent?.slice(1))).toEqual([
      'It applies',
      'Should be attended earlier',
      'Should be attended later',
    ])
  })

  it('asks for the why once a verdict is chosen, and sends nothing until it says something', async () => {
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2024-6387')

    expect(within(dialog).queryByLabelText('Why')).not.toBeInTheDocument()
    const later = within(dialog).getByRole('button', { name: 'Should be attended later' })
    await user.click(later)
    expect(later).toHaveAttribute('aria-pressed', 'true')
    const send = within(dialog).getByRole('button', { name: 'Send' })

    expect(send).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Why'), '   ')
    expect(send).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Why'), 'Ok')
    expect(send).toBeEnabled()
    expect(within(dialog).getByText('5 / 2000')).toBeInTheDocument()
  })

  it('still shows feedback recorded before it could only be about the order', async () => {
    const [newest, ...older] = prioritizationsStore.load()
    const finding = newest.findings.find((f) => f.cve_id === 'CVE-2024-6387')!
    const recorded = (verdict: 'does_not_apply' | 'remediated') => ({
      id: verdict,
      finding_id: finding.finding_id,
      author_id: 'someone',
      verdict,
      note: `Said ${verdict}.`,
      via_analista: false,
      created_at: '2026-11-01T10:00:00Z',
    })
    prioritizationsStore.save([{ ...newest, feedback: [recorded('does_not_apply'), recorded('remediated')] }, ...older])
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2024-6387')

    expect(within(dialog).getByText('It does not apply', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText('Already remediated', { selector: 'span' })).toBeInTheDocument()
  })

  it('says why the backend turned feedback away', async () => {
    server.use(http.post(apiUrl('/prioritizations/:id/feedback'), () => failure(400, 'invalid_request', 'validation failed')))
    const user = await renderFindings()
    const dialog = await openFinding(user, 'CVE-2024-6387')

    await user.click(within(dialog).getByRole('button', { name: 'It applies' }))
    await user.type(within(dialog).getByLabelText('Why'), 'Corre la nómina.')
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    expect(await within(dialog).findByText('The request is incomplete. Check the fields.')).toBeInTheDocument()
  })

  it('says there is nothing yet before the first prioritization', async () => {
    prioritizationsStore.save([])
    renderApp('/findings')

    expect(await screen.findByText(/No findings yet/)).toBeInTheDocument()
  })

  describe('tabs', () => {
    it('shows the prioritized list by default and switches to Summary', async () => {
      const user = renderApp('/findings')
      await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })

      await user.click(screen.getByRole('tab', { name: 'Summary' }))

      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true')
      expect(await screen.findByText('Weekly trend')).toBeInTheDocument()
    })
  })

  describe('summary tab', () => {
    it('shows time-to-close bars for bands that have closures', async () => {
      await openSummaryTab()

      expect(await screen.findByText('3.5 days')).toBeInTheDocument() // critical
      expect(screen.getByText('7.2 days')).toBeInTheDocument()
      expect(screen.getByText('14.1 days')).toBeInTheDocument()
      expect(screen.getByText('45.0 days')).toBeInTheDocument()
    })

    it('shows — and none-closed text for a band with no closures', async () => {
      await openSummaryTab()

      expect(await screen.findByText('—')).toBeInTheDocument()
      expect(screen.getByText('None closed in this period')).toBeInTheDocument()
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

    it('forgets the counts of a CMDB once it is disconnected', async () => {
      seedSource()
      const user = renderApp('/findings')
      expect(await screen.findByText('23')).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Configuration' }))
      await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
      await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))
      await screen.findByRole('heading', { name: 'Choose your CMDB' })

      holdRequests('get', '/findings/summary')
      await user.click(screen.getByRole('link', { name: 'Findings' }))
      expect(await screen.findByText('Critical on internet-facing')).toBeInTheDocument()
      expect(screen.queryByText('23')).not.toBeInTheDocument()
    })
  })

  describe('filters', () => {
    it('filters by band and hides empty groups', async () => {
      await renderFindings()

      const bandSelect = screen.getByRole('combobox', { name: 'Risk level' })
      fireEvent.change(bandSelect, { target: { value: 'critical' } })

      // Only the first group holds a Critical finding.
      await waitFor(() =>
        expect(within(screen.getByRole('main')).getAllByRole('region').map((g) => within(g).getByRole('heading').textContent)).toEqual([
          'Fallos con exploit activo sobre servicios expuestos a internet',
        ]),
      )
      expect(screen.getByRole('button', { name: 'Open CVE-2021-41773' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Open CVE-2023-44487' })).not.toBeInTheDocument()
      expect(window.location.search).toContain('band=critical')
    })

    it('shows no-results message when no findings match the filter', async () => {
      await renderFindings()

      fireEvent.change(screen.getByRole('combobox', { name: 'Risk level' }), {
        target: { value: 'unbanded' },
      })

      expect(await screen.findByText('No findings match the active filters.')).toBeInTheDocument()
    })

    it('shows a chip for the active band filter and removes it', async () => {
      const user = renderApp('/findings?band=critical')
      await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })

      expect(screen.getByText('Risk level: Critical')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remove filter' }))

      await waitFor(() => expect(screen.queryByText('Risk level: Critical')).not.toBeInTheDocument())
    })

    it('removes the from=chart label when all chips are cleared', async () => {
      const user = renderApp('/findings?band=critical&from=chart')
      await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })

      await user.click(screen.getByRole('button', { name: 'Remove filter' }))

      await waitFor(() => {
        expect(screen.queryByText('From the chart:')).not.toBeInTheDocument()
        expect(screen.queryByText('Risk level: Critical')).not.toBeInTheDocument()
      })
    })

    it('clears all filters with the clear-all button', async () => {
      const user = renderApp('/findings?band=critical&kev=1')
      await screen.findByRole('region', { name: 'Fallos con exploit activo sobre servicios expuestos a internet' })

      // Both the chip label ("Band: Critical") and the KEV chip are shown;
      // "KEV only" appears twice: once in the checkbox label, once in the chip.
      expect(screen.getByText('Risk level: Critical')).toBeInTheDocument()
      expect(screen.getAllByText('KEV only')).toHaveLength(2)

      await user.click(screen.getByRole('button', { name: 'Clear all' }))

      await waitFor(() => {
        expect(screen.queryByText('Risk level: Critical')).not.toBeInTheDocument()
        // After clearing, only the checkbox label "KEV only" remains (no chip).
        expect(screen.getAllByText('KEV only')).toHaveLength(1)
      })
    })
  })

  describe('risk tab', () => {
    it('tells what each colour of the asset bars means', async () => {
      await openRiskTab()
      const assets = (await screen.findByRole('heading', { name: 'Assets with most findings' })).closest('section')!

      const legend = await within(assets).findByRole('list', { name: 'Risk level' })
      expect(within(legend).getByText('Critical')).toBeInTheDocument()
    })
    it('clicking a heatmap cell navigates to the prioritized list with band and exposure filters', async () => {
      const user = await openRiskTab()
      // Critical × internet_facing cell (count=5 from mock)
      const cell = await screen.findByLabelText(/5 findings: Critical on Internet/)
      await user.click(cell)
      expect(await screen.findByText('Risk level: Critical')).toBeInTheDocument()
      expect(screen.getByText('Exposure: Internet-facing')).toBeInTheDocument()
      expect(screen.getByText('From the chart:')).toBeInTheDocument()
    })

    it('clicking an asset bar navigates to the prioritized list', async () => {
      const user = await openRiskTab()
      const assetBar = await screen.findByRole('button', { name: /web-prod-01/ })
      await user.click(assetBar)
      expect(await screen.findByText('Asset: web-prod-01')).toBeInTheDocument()
      expect(screen.getByText('From the chart:')).toBeInTheDocument()
    })

    it('clicking an area heatmap cell navigates with band and area filters', async () => {
      const user = await openRiskTab()
      await user.click(await screen.findByRole('button', { name: 'Area' }))
      // High × Producción cell (count=6 from mock)
      const cell = await screen.findByLabelText(/6 findings: High on Producción/)
      await user.click(cell)
      expect(await screen.findByText('Risk level: High')).toBeInTheDocument()
      expect(screen.getByText('Area: Producción')).toBeInTheDocument()
      expect(screen.getByText('From the chart:')).toBeInTheDocument()
    })

    it('shows KEV badges in the CVE table', async () => {
      await openRiskTab()
      const kevBadges = await screen.findAllByText('Yes')
      expect(kevBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('before & after tab', () => {
    it('shows the movement summary cards', async () => {
      await openBeforeAfterTab()

      const subioLabel = await screen.findByText('Went up')
      expect(subioLabel).toBeInTheDocument()
      expect(screen.getByText('Stayed')).toBeInTheDocument()
      expect(screen.getByText('Went down')).toBeInTheDocument()
      // Count span is the previous sibling of the label span
      expect(subioLabel.previousElementSibling).toHaveTextContent('6')
    })

    it('tells what each colour of the composition per group means', async () => {
      await openBeforeAfterTab()
      const composition = (await screen.findByRole('heading', { name: 'Risk level composition per group' })).closest('section')!

      const legend = within(composition).getByRole('list', { name: 'Risk level' })
      expect(within(legend).getAllByRole('listitem').length).toBeGreaterThan(1)
    })

    it('shows diagonal cell for G1 (3 findings stayed in SG1→G1)', async () => {
      await openBeforeAfterTab()

      // Diagonal cell SG1→G1 should contain 3
      const cell = await screen.findByLabelText('3 findings from score group 1 in priority group 1')
      expect(cell).toBeInTheDocument()
    })

    it('lists the most significant movements without their reason, which the detail tells', async () => {
      await openBeforeAfterTab()

      const table = (await screen.findByRole('heading', { name: 'Most significant movements' })).closest('section')!
      const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
      expect(headers).not.toContain('Reason')
      expect(within(table).getByRole('button', { name: 'Open CVE-2024-23897' })).toBeInTheDocument()
    })

    it('opens a movement’s finding over the tab, and closing it comes back to the tab', async () => {
      const user = await openBeforeAfterTab()
      const table = (await screen.findByRole('heading', { name: 'Most significant movements' })).closest('section')!

      await user.click(within(table).getByRole('button', { name: 'Open CVE-2024-23897' }).closest('tr')!)
      const dialog = await screen.findByRole('dialog', { name: 'CVE-2024-23897' })
      expect(within(dialog).getByRole('button', { name: /^Prioritization history/ })).toBeInTheDocument()
      expect(window.location.search).toContain('finding=')

      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Before & After' })).toHaveAttribute('aria-selected', 'true')
      expect(window.location.search).not.toContain('finding=')
    })

  })

  describe('threats tab', () => {
    it('shows the coverage label with labeled and open counts', async () => {
      await openThreatsTab()
      expect(await screen.findByText('22 of 35 open findings have an ATT&CK label')).toBeInTheDocument()
    })

    it('shows all 14 ATT&CK tactics in the heatmap', async () => {
      await openThreatsTab()
      expect(await screen.findByText('Initial Access')).toBeInTheDocument()
      expect(screen.getByText('Impact')).toBeInTheDocument()
      expect(screen.getByText('Reconnaissance')).toBeInTheDocument()
    })

    it('shows the top techniques table with technique IDs', async () => {
      await openThreatsTab()
      expect(await screen.findByRole('heading', { name: 'Top techniques' })).toBeInTheDocument()
      expect(screen.getByText('T1190')).toBeInTheDocument()
      expect(screen.getByText('Exploit Public-Facing Application')).toBeInTheDocument()
    })
  })
})
