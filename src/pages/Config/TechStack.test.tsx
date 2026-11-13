import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Asset, AssetsPage } from '../../api/assets'
import { i18n } from '../../i18n'
import { importedExposure, mockAssets } from '../../mocks/assets'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { server } from '../../test/server'

const [prodApi, analyticsWorker, crmDb] = mockAssets

// The seed's Active Assets, in inventory order.
const ACTIVE = [
  'prod-api-01',
  'analytics-worker-03',
  'crm-db-primary',
  'core-switch-01',
  'payments-gateway',
  'reporting-batch-01',
  'ledger-db',
]

function renderConnected() {
  seedSource()
  return renderApp()
}

async function renderInventory() {
  const user = renderConnected()
  await screen.findByRole('option', { name: /prod-api-01/ })
  return user
}

function page(assets: Asset[], nextCursor: string | null, total = 3): AssetsPage {
  return { assets, next_cursor: nextCursor, total }
}

// The filter selects have options too; the Assets are the listbox's.
function assetList() {
  return within(screen.getByRole('listbox'))
}

function option(name: string) {
  return assetList().getByRole('option', { name: new RegExp(name) })
}

function gap(name: string) {
  return within(option(name)).queryByRole('img')
}

// An option's name starts with the Asset's name, then its Kind, Area, gaps and Criticality.
function startsWith(name: string) {
  return new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `)
}

function expectSelected(name: string) {
  expect(assetList().getByRole('option', { selected: true })).toHaveAccessibleName(startsWith(name))
}

/** The record pane, which shows one Asset at a time. */
function record() {
  return screen.getByRole('article')
}

function fact(label: string) {
  return within(record()).getByText(label).nextElementSibling
}

// Serves two pages and records the query of every request, so tests can check what was sent.
function serveTwoPages() {
  const queries: Record<string, string>[] = []
  server.use(
    http.get(apiUrl('/assets'), ({ request }) => {
      const params = new URL(request.url).searchParams
      queries.push(Object.fromEntries(params))
      return HttpResponse.json(
        params.get('cursor') === 'page-2' ? page([crmDb], null) : page([prodApi, analyticsWorker], 'page-2'),
      )
    }),
  )
  return queries
}

describe('Tech stack', () => {
  it('lists only the active assets by default, with translated labels', async () => {
    await renderInventory()

    expect(screen.getByText('7 assets')).toBeInTheDocument()
    const options = assetList().getAllByRole('option')
    expect(options).toHaveLength(ACTIVE.length)
    ACTIVE.forEach((name, index) => expect(options[index]).toHaveAccessibleName(startsWith(name)))
    expect(option('prod-api-01')).toHaveTextContent('prod-api-01 Server · Infrastructure High')
    expect(option('analytics-worker-03')).toHaveTextContent('Virtual Machine · Data Platform Medium')
    expect(option('core-switch-01')).toHaveTextContent('Network Device · No Area Low')
    expect(screen.queryByRole('option', { name: /erp-app-02/ })).not.toBeInTheDocument()
  })

  it('selects the first asset on load and shows its full record', async () => {
    await renderInventory()

    expect(option('prod-api-01')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('listbox', { name: 'Tech stack' })).toHaveAttribute(
      'aria-activedescendant',
      option('prod-api-01').id,
    )
    const details = within(screen.getByRole('article', { name: 'prod-api-01' }))
    expect(details.getByRole('heading', { name: 'prod-api-01' })).toBeInTheDocument()
    expect(details.getByText('SRV-001').parentElement).toHaveTextContent(/^Server·SRV-001·Active$/)
    expect(details.getByText('Main production API server')).toBeInTheDocument()
    expect(fact('Criticality')).toHaveTextContent(/^High$/)
    expect(fact('Exposure')).toHaveTextContent('Internet-facing·iTop')
    expect(fact('Lifecycle Stage')).toHaveTextContent(/^Production$/)
    expect(fact('Owner')).toHaveTextContent(/^devops@example\.com$/)
    expect(fact('Area')).toHaveTextContent(/^Infrastructure$/)
    expect(fact('Hardware')).toHaveTextContent(/^Dell PowerEdge R640$/)
    expect(fact('Retired in the CMDB')).toHaveTextContent(/^No$/)
  })

  it('the record lists every software component, marking only the unidentified ones', async () => {
    await renderInventory()

    const details = within(record())
    expect(details.getByText('1 of 3 unidentified')).toBeInTheDocument()
    const components = details.getAllByRole('listitem')
    expect(components.map((item) => item.textContent)).toEqual([
      'Ubuntu 22.04Operating SystemCanonical Ubuntu',
      'nginx 1.24.0ApplicationF5 nginx',
      'internal-billing-agentApplicationUnidentified',
    ])
    expect(within(components[2]).getByText('Unidentified')).toHaveAttribute(
      'title',
      'Not matched to a Product: threats cannot be checked against it.',
    )
  })

  it('clicking an asset shows its record, saying what it lacks', async () => {
    const user = await renderInventory()

    await user.click(option('analytics-worker-03'))

    expect(option('analytics-worker-03')).toHaveAttribute('aria-selected', 'true')
    expect(option('prod-api-01')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('article', { name: 'analytics-worker-03' })).toBeInTheDocument()
    expect(fact('Owner')).toHaveTextContent(/^data-eng@example\.comDeclared$/)
    expect(fact('Hardware')).toHaveTextContent(/^No hardware recorded$/)
    expect(fact('Exposure')).toHaveTextContent('Unknown·iTop')
    expect(fact('Lifecycle Stage')).toHaveTextContent(/^Implementation$/)
    expect(within(record()).queryByText(/unidentified/)).not.toBeInTheDocument()

    await user.click(option('core-switch-01'))
    expect(fact('Owner')).toHaveTextContent(/^-$/)
    expect(fact('Area')).toHaveTextContent(/^-$/)
    expect(fact('Lifecycle Stage')).toHaveTextContent(/^Unknown$/)
    expect(within(record()).getByText('No Software Components recorded')).toBeInTheDocument()
  })

  it('clicking an asset focuses the list, so the arrows work right after', async () => {
    const user = await renderInventory()

    await user.click(option('crm-db-primary'))
    expect(screen.getByRole('listbox')).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expectSelected('core-switch-01')
  })

  it('arrows, Home and End move the selection, and the record follows', async () => {
    const user = await renderInventory()
    const listbox = screen.getByRole('listbox')
    listbox.focus()

    // The keys move the selection, not the page: their default scroll is prevented.
    expect(fireEvent.keyDown(listbox, { key: 'End' })).toBe(false)
    expect(fireEvent.keyDown(listbox, { key: 'Home' })).toBe(false)
    expect(fireEvent.keyDown(listbox, { key: 'Tab' })).toBe(true)
    await user.keyboard('{ArrowDown}')
    expectSelected('analytics-worker-03')
    expect(screen.getByRole('article', { name: 'analytics-worker-03' })).toBeInTheDocument()

    await user.keyboard('{ArrowUp}{ArrowUp}')
    expectSelected('prod-api-01')

    await user.keyboard('{End}')
    expectSelected('ledger-db')
    await user.keyboard('{ArrowDown}')
    expectSelected('ledger-db')
    expect(screen.getByRole('article', { name: 'ledger-db' })).toBeInTheDocument()

    await user.keyboard('{Home}')
    expectSelected('prod-api-01')
    expect(screen.getByRole('article', { name: 'prod-api-01' })).toBeInTheDocument()
  })

  it('flags the assets with Unknown Exposure or Unidentified Components, and only those', async () => {
    const unidentified = prodApi.software[2]
    const both: Asset = {
      ...prodApi,
      record_id: 'SRV-009',
      name: 'legacy-billing',
      exposure: importedExposure(null),
      software: [unidentified, { ...unidentified, name: 'cron-agent' }],
    }
    server.use(
      http.get(apiUrl('/assets'), () =>
        HttpResponse.json(page([prodApi, analyticsWorker, crmDb, both], null, 4)),
      ),
    )
    await renderInventory()

    expect(gap('prod-api-01')).toHaveAccessibleName('1 Unidentified Component')
    expect(gap('analytics-worker-03')).toHaveAccessibleName('Unknown Exposure')
    expect(gap('legacy-billing')).toHaveAccessibleName('Unknown Exposure · 2 Unidentified Components')
    expect(gap('crm-db-primary')).not.toBeInTheDocument()
  })

  it('shows the inventory in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    renderConnected()

    expect(await screen.findByText('Cargando inventario…')).toBeInTheDocument()
    await screen.findByRole('option', { name: /prod-api-01/ })
    expect(screen.getByRole('heading', { name: 'Stack tecnológico' })).toBeInTheDocument()
    expect(screen.getByText('7 activos')).toBeInTheDocument()
    expect(screen.getByText('↑ ↓ para moverte')).toBeInTheDocument()
    expect(option('prod-api-01')).toHaveTextContent('prod-api-01 Servidor · Infrastructure Alta')
    expect(option('prod-api-01')).toHaveAccessibleName(/1 componente no identificado/)
    expect(option('core-switch-01')).toHaveTextContent('Dispositivo de red · Sin área')
    const details = within(screen.getByRole('article', { name: 'prod-api-01' }))
    expect(details.getByText('SRV-001').parentElement).toHaveTextContent(/^Servidor·SRV-001·Activo$/)
    expect(fact('Exposición')).toHaveTextContent('Expuesto a internet·iTop')
    expect(fact('Ciclo de vida')).toHaveTextContent(/^Producción$/)
    expect(fact('Retirado en la CMDB')).toHaveTextContent(/^No$/)
    expect(details.getByText('1 de 3 no identificado')).toBeInTheDocument()
    expect(details.getByText('No identificado')).toBeInTheDocument()
  })

  it('the inactive filter reaches assets no longer monitored and says since when', async () => {
    const user = await renderInventory()

    await user.selectOptions(screen.getByLabelText('Status'), 'Inactive')

    expect(await screen.findByRole('option', { name: /erp-app-02/ })).toHaveTextContent('Unknown')
    expect(screen.getByText('1 asset')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /prod-api-01/ })).not.toBeInTheDocument()
    const details = within(screen.getByRole('article', { name: 'erp-app-02' }))
    expect(details.getByText('Inactive since Sep 1, 2026')).toBeInTheDocument()
    expect(fact('Retired in the CMDB')).toHaveTextContent(/^Yes$/)
    // A retired Asset has no Lifecycle Stage at all, so it isn't shown as Unknown.
    expect(fact('Lifecycle Stage')).toHaveTextContent(/^-$/)
  })

  it('pages forward and back repeating the filters on every request', async () => {
    const queries = serveTwoPages()
    const user = await renderInventory()

    await user.selectOptions(screen.getByLabelText('Type'), 'Server')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('option', { name: /crm-db-primary/ })).toBeInTheDocument()
    expect(screen.getByText('Page 2')).toBeInTheDocument()
    expect(queries[queries.length - 1]).toEqual({ limit: '50', active: 'true', kind: 'server', cursor: 'page-2' })

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByRole('option', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeInTheDocument()
  })

  it('a page change selects the first asset of the new page', async () => {
    serveTwoPages()
    const user = await renderInventory()
    await user.click(option('analytics-worker-03'))

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('option', { name: /crm-db-primary/ })
    expect(screen.getByRole('article', { name: 'crm-db-primary' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await screen.findByRole('option', { name: /prod-api-01/ })
    expectSelected('prod-api-01')
    expect(screen.getByRole('article', { name: 'prod-api-01' })).toBeInTheDocument()
  })

  it('while the next page loads, the list keeps the previous one, marked busy', async () => {
    let releasePage2!: () => void
    const page2Held = new Promise<void>((resolve) => {
      releasePage2 = resolve
    })
    serveTwoPages()
    server.use(
      http.get(apiUrl('/assets'), async ({ request }) => {
        if (new URL(request.url).searchParams.get('cursor') === 'page-2') await page2Held
        return undefined
      }),
    )
    const user = await renderInventory()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true')
    expect(option('prod-api-01')).toHaveAttribute('aria-selected', 'true')
    releasePage2()
    expect(await screen.findByRole('option', { name: /crm-db-primary/ })).toBeInTheDocument()
    expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-busy')
  })

  it('changing a filter drops the cursor and starts again from page one', async () => {
    const queries = serveTwoPages()
    const user = await renderInventory()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('option', { name: /crm-db-primary/ })

    await user.selectOptions(screen.getByLabelText('Criticality'), 'High')

    expect(await screen.findByRole('option', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeInTheDocument()
    expect(queries[queries.length - 1]).toEqual({ limit: '50', active: 'true', criticality: 'high' })
  })

  it('a later page that fails or comes back empty still offers the way back', async () => {
    let page2: 'failing' | 'empty' = 'failing'
    serveTwoPages()
    server.use(
      http.get(apiUrl('/assets'), ({ request }) => {
        if (new URL(request.url).searchParams.get('cursor') !== 'page-2') return undefined
        return page2 === 'failing'
          ? HttpResponse.json({ code: 'internal_error', error: 'boom' }, { status: 500 })
          : HttpResponse.json(page([], null, 2))
      }),
    )
    const user = await renderInventory()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('alert', {}, { timeout: 1000 })).toBeInTheDocument()
    expect(screen.getByText('Page 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByRole('option', { name: /prod-api-01/ })).toBeInTheDocument()

    page2 = 'empty'
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('There are no assets in the inventory.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByRole('option', { name: /prod-api-01/ })).toBeInTheDocument()
  })

  it('a filter that leaves the selected asset out selects the first match', async () => {
    const user = await renderInventory()
    await user.click(option('core-switch-01'))

    await user.selectOptions(screen.getByLabelText('Criticality'), 'High')

    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /core-switch-01/ })).not.toBeInTheDocument(),
    )
    expectSelected('prod-api-01')
    expect(screen.getByRole('article', { name: 'prod-api-01' })).toBeInTheDocument()
  })

  it('a cursor the backend rejects restarts the listing from page one', async () => {
    server.use(
      http.get(apiUrl('/assets'), ({ request }) =>
        new URL(request.url).searchParams.has('cursor')
          ? HttpResponse.json({ code: 'invalid_request', error: 'cursor does not match' }, { status: 400 })
          : HttpResponse.json(page([prodApi], 'stale')),
      ),
    )
    const user = await renderInventory()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 1')).toBeInTheDocument()
    expect(option('prod-api-01')).toBeInTheDocument()
  })

  it('a slow response for filters already replaced is never shown', async () => {
    let serversAnswered = false
    let releaseServers!: () => void
    const serversHeld = new Promise<void>((resolve) => {
      releaseServers = resolve
    })
    server.use(
      http.get(apiUrl('/assets'), async ({ request }) => {
        const kind = new URL(request.url).searchParams.get('kind')
        if (kind === 'server') {
          await serversHeld
          serversAnswered = true
          return HttpResponse.json(page([prodApi], null, 1))
        }
        if (kind === 'virtual_machine') return HttpResponse.json(page([analyticsWorker], null, 1))
        return HttpResponse.json(page([crmDb], null, 1))
      }),
    )
    const user = renderConnected()
    await screen.findByRole('option', { name: /crm-db-primary/ })

    await user.selectOptions(screen.getByLabelText('Type'), 'Server')
    await user.selectOptions(screen.getByLabelText('Type'), 'Virtual Machine')
    await screen.findByRole('option', { name: /analytics-worker-03/ })
    releaseServers()

    await waitFor(() => expect(serversAnswered).toBe(true))
    // One more task lets the client process the late response before checking it was ignored.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(option('analytics-worker-03')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /prod-api-01/ })).not.toBeInTheDocument()
  })

  it('shows the empty state when the inventory has no assets', async () => {
    server.use(http.get(apiUrl('/assets'), () => HttpResponse.json(page([], null, 0))))
    renderConnected()

    expect(await screen.findByText('There are no assets in the inventory.')).toBeInTheDocument()
    expect(screen.getByText('0 assets')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('says no asset matches when the filters exclude every asset', async () => {
    const user = await renderInventory()

    await user.selectOptions(screen.getByLabelText('Type'), 'Workstation')

    expect(await screen.findByText('No assets match these filters.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows the error right away when the inventory cannot be read, and retries on demand', async () => {
    let failing = true
    server.use(
      http.get(apiUrl('/assets'), () =>
        failing
          ? HttpResponse.json({ code: 'internal_error', error: 'boom' }, { status: 500 })
          : HttpResponse.json(page([prodApi], null, 1)),
      ),
    )
    const user = renderConnected()

    const alert = await screen.findByRole('alert', {}, { timeout: 1000 })
    expect(alert).toHaveTextContent('The server had an internal error. Try again.')
    expect(screen.queryByText('There are no assets in the inventory.')).not.toBeInTheDocument()

    failing = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('option', { name: /prod-api-01/ })).toBeInTheDocument()
  })

  it('says the server is unreachable when the inventory request gets no answer', async () => {
    server.use(http.get(apiUrl('/assets'), () => HttpResponse.error()))
    renderConnected()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server to load the inventory.',
    )
  })
})
