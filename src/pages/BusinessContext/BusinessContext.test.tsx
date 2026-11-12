import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { DraftSource } from '../../api/businessContext'
import type { AuthUser } from '../../auth/store'
import { businessContextStore, MOCK_DRAFT, unsaved } from '../../mocks/business-context-store'
import { apiUrl } from '../../mocks/url'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const VIEWER: AuthUser = {
  id: 'viewer-id',
  email: 'viewer@test.example',
  role: 'viewer',
  customer: { id: 'test-customer-id', name: 'Test Org' },
}

async function renderPage(user?: AuthUser) {
  const ui = renderApp('/business-context', user)
  // The title shows while the context loads, so the page is ready once the loading message is gone.
  await screen.findByRole('heading', { name: 'Business context', level: 1 })
  await waitFor(() => expect(screen.queryByText('Loading the business context…')).not.toBeInTheDocument())
  return ui
}

// A Customer that has saved nothing starts at the import screen; this skips it.
async function fillByHand() {
  const user = await renderPage()
  await user.click(screen.getByRole('button', { name: 'Fill it in by hand' }))
  return user
}

function seedSaved(summary: string, version = 1) {
  const stored = unsaved()
  stored.version = version
  stored.saved_at = '2026-11-01T12:00:00Z'
  stored.saved_by = 'admin@test.example'
  stored.context.profile.summary = summary
  businessContextStore.save(stored)
}

describe('Business context', () => {
  it('is in the navigation of every User of a Customer', async () => {
    await renderPage(VIEWER)

    expect(screen.getByRole('link', { name: 'Business context' })).toHaveAttribute('aria-current', 'page')
  })

  it('starts by offering to import documents until something is saved', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: 'Start with your documents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import documents' })).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('opens on the sections once something is saved', async () => {
    seedSaved('We sell shoes online.')
    await renderPage()

    expect(screen.queryByRole('heading', { name: 'Start with your documents' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Profile/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('What does your organization do?')).toHaveValue('We sell shoes online.')
  })

  it('lets a Customer Admin fill it in section by section and save it as the next version', async () => {
    const user = await fillByHand()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText('What does your organization do?'), 'We sell shoes online.')
    await user.click(screen.getByRole('combobox', { name: 'Industry sectors' }))
    await user.click(await screen.findByRole('option', { name: 'E-commerce' }))
    await user.keyboard('{Escape}')
    await user.selectOptions(screen.getByLabelText('Employees'), '50–249')

    await user.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('tab', { name: /Location/ })).toHaveAttribute('aria-selected', 'true')
    await user.selectOptions(screen.getByLabelText('Headquarters'), 'Mexico')

    await user.click(screen.getByRole('tab', { name: /Operations/ }))
    await user.click(screen.getByRole('button', { name: /Add critical service/ }))
    await user.type(screen.getByRole('textbox', { name: 'Service' }), 'Online store')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Impact if it goes down' }), 'High impact')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Maximum time without it' }), 'Tolerates 4–24 hours')

    await user.click(screen.getByRole('tab', { name: /Digital footprint/ }))
    await user.type(screen.getByLabelText('Domains'), 'https://www.Shoes.example/home{Enter}')
    expect(screen.getByText('shoes.example')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Risk/ }))
    await user.selectOptions(screen.getByLabelText('Risk appetite'), 'Cautious: accept some risk for clear benefits')

    await user.click(save)

    expect(await screen.findByText(/Saved/)).toBeInTheDocument()
    const stored = businessContextStore.load()
    expect(stored.version).toBe(1)
    expect(stored.context.profile).toMatchObject({ summary: 'We sell shoes online.', sectors: ['e-commerce'], employees: '50_249' })
    expect(stored.context.geography).toEqual({ headquarters: 'MX', countries: ['MX'] })
    expect(stored.context.operations.critical_services).toEqual([
      { name: 'Online store', description: '', impact: 'high', max_downtime: '4h_24h', assets: [] },
    ])
    expect(stored.context.footprint.domains).toEqual(['shoes.example'])
    expect(stored.context.risk.appetite).toBe('cautious')
  })

  it('refuses an entry that is not a domain', async () => {
    const user = await fillByHand()
    await user.click(screen.getByRole('tab', { name: /Digital footprint/ }))

    await user.type(screen.getByLabelText('Domains'), 'not a domain{Enter}')

    expect(screen.getByText('“not a domain” is not a domain such as example.com.')).toBeInTheDocument()
    expect(screen.getByLabelText('Domains')).toHaveValue('not a domain')
  })

  it('shows the section that stops a save', async () => {
    const user = await fillByHand()
    await user.click(screen.getByRole('tab', { name: /Operations/ }))
    await user.click(screen.getByRole('button', { name: /Add critical service/ }))
    await user.type(screen.getByRole('textbox', { name: 'Service' }), ' ')
    await user.click(screen.getByRole('tab', { name: /Profile/ }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Give the service a name.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Operations/ })).toHaveAttribute('aria-selected', 'true')
    expect(businessContextStore.load().version).toBe(0)
  })

  it('reads several documents together and places what they say in each section', async () => {
    const user = await renderPage()
    let sent: DraftSource | undefined
    server.use(
      http.post(apiUrl('/business-context/draft'), async ({ request }) => {
        sent = (await request.json()) as DraftSource
        return HttpResponse.json({ context: MOCK_DRAFT, gaps: [] })
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Import documents' }))
    const dialog = await screen.findByRole('dialog')
    await user.upload(within(dialog).getByLabelText('Files'), [
      new File(['%PDF-1.7'], 'perfil.pdf', { type: 'application/pdf' }),
      new File(['# Notas'], 'notas.md', { type: '' }),
    ])
    expect(within(dialog).getByText('perfil.pdf')).toBeInTheDocument()
    expect(within(dialog).getByText('notas.md')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Or paste text'), 'Somos ACME.')
    await user.click(within(dialog).getByRole('button', { name: 'Generate draft' }))

    expect(await screen.findByText(/fields were filled from your documents/)).toBeInTheDocument()
    expect(sent?.text).toBe('Somos ACME.')
    expect(sent?.files?.map((f) => [f.name, f.media_type])).toEqual([
      ['perfil.pdf', 'application/pdf'],
      ['notas.md', 'text/markdown'],
    ])
    expect(screen.getByText('Financial services')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Operations/ }))
    expect(screen.getByDisplayValue('Pagos en línea')).toBeInTheDocument()
    expect(businessContextStore.load().version).toBe(0)
  })

  it('fills the form from documents without replacing what was typed', async () => {
    const user = await fillByHand()
    await user.type(screen.getByLabelText('What does your organization do?'), 'Our own words.')

    await user.click(screen.getByRole('button', { name: 'Import documents' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Or paste text'), 'ACME Corp procesa pagos en línea…')
    await user.click(within(dialog).getByRole('button', { name: 'Generate draft' }))
    await screen.findByText(/fields were filled from your documents/)

    expect(screen.getByLabelText('What does your organization do?')).toHaveValue('Our own words.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText(/Saved/)
    const saved = businessContextStore.load().context
    expect(saved.profile.summary).toBe('Our own words.')
    expect(saved.operations.regulations).toEqual(MOCK_DRAFT.operations.regulations)
    expect(saved.operations.critical_services).toEqual(MOCK_DRAFT.operations.critical_services)
  })

  it('refuses a file the agent cannot read before sending anything', async () => {
    const user = await renderPage()
    let drafts = 0
    server.use(
      http.post(apiUrl('/business-context/draft'), () => {
        drafts++
        return HttpResponse.json({})
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Import documents' }))
    const dialog = await screen.findByRole('dialog')
    // A user can pick any file by switching the browser's file filter, which `accept` only suggests.
    const anyFile = userEvent.setup({ applyAccept: false })
    await anyFile.upload(within(dialog).getByLabelText('Files'), new File(['x'], 'logo.png', { type: 'image/png' }))
    await user.click(within(dialog).getByRole('button', { name: 'Generate draft' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('logo.png: the agent reads PDF, Word (.docx), TXT, Markdown, CSV and JSON files.')
    expect(drafts).toBe(0)
  })

  it('asks for something to read', async () => {
    const user = await renderPage()

    await user.click(screen.getByRole('button', { name: 'Import documents' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Generate draft' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose at least one file or paste some text.')
  })

  it('tells a translated reason when the agent cannot draft', async () => {
    const user = await renderPage()
    server.use(
      http.post(apiUrl('/business-context/draft'), () =>
        HttpResponse.json({ code: 'agent_unavailable', error: 'the agent is unavailable' }, { status: 502 }),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Import documents' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Or paste text'), 'ACME')
    await user.click(within(dialog).getByRole('button', { name: 'Generate draft' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The agent is unavailable right now.')
  })

  it('warns when someone else saved first and reloads the newest version', async () => {
    seedSaved('First version.')
    const user = await renderPage()
    server.use(
      http.put(apiUrl('/business-context'), () =>
        HttpResponse.json({ code: 'business_context_stale', error: 'stale' }, { status: 409 }),
      ),
    )

    await user.type(screen.getByLabelText('What does your organization do?'), ' Edited.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else saved a newer version while you were editing.')
    seedSaved('Second version.', 2)
    await user.click(screen.getByRole('button', { name: 'Load the newest version' }))

    expect(await screen.findByDisplayValue('Second version.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows a Viewer what was stated without letting them edit', async () => {
    seedSaved('We sell shoes online.')
    await renderPage(VIEWER)

    expect(screen.getByText('We sell shoes online.')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(3)
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import documents' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('tells a Viewer when nothing was stated yet', async () => {
    await renderPage(VIEWER)

    expect(screen.getByText('Your organization has not stated its business context yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import documents' })).not.toBeInTheDocument()
  })
})
