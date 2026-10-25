import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Asset, AssetsPage } from '../../api/assets'
import { i18n } from '../../i18n'
import { mockAssets } from '../../test/mocks/assets'
import { apiUrl } from '../../test/mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { server } from '../../test/server'

const [prodApi, analyticsWorker, crmDb] = mockAssets

async function renderInventory() {
  seedSource()
  const user = renderApp()
  await screen.findByText('iTop connected')
  return user
}

function page(assets: Asset[], nextCursor: string | null, total = 3): AssetsPage {
  return { assets, next_cursor: nextCursor, total }
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

    const row = await screen.findByRole('row', { name: /prod-api-01/ })
    expect(screen.getByText('4 assets')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Asset', 'Type', 'Operating system', 'Criticality', 'Owner', 'Status', 'Details',
    ])
    expect(row).toHaveTextContent('prod-api-01SRV-001ServerUbuntu 22.04Highdevops@example.comActive')
    expect(screen.getByRole('row', { name: /analytics-worker-03/ })).toHaveTextContent(
      'Virtual Machine',
    )
    expect(screen.getByRole('row', { name: /analytics-worker-03/ })).toHaveTextContent(
      'data-eng@example.comDeclared',
    )
    expect(screen.queryByRole('row', { name: /erp-app-02/ })).not.toBeInTheDocument()
  })

  it('shows the inventory in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    seedSource()
    renderApp()

    expect(await screen.findByText('Cargando inventario…')).toBeInTheDocument()
    const row = await screen.findByRole('row', { name: /prod-api-01/ })
    expect(screen.getByRole('heading', { name: 'Stack tecnológico' })).toBeInTheDocument()
    expect(screen.getByText('4 activos')).toBeInTheDocument()
    expect(row).toHaveTextContent('prod-api-01SRV-001ServidorUbuntu 22.04Altadevops@example.comActivo')
  })

  it('the inactive filter reaches assets no longer monitored and says since when', async () => {
    const user = await renderInventory()
    await screen.findByRole('row', { name: /prod-api-01/ })

    await user.selectOptions(screen.getByLabelText('Status'), 'Inactive')

    const row = await screen.findByRole('row', { name: /erp-app-02/ })
    expect(row).toHaveTextContent('Unknown')
    expect(row).toHaveTextContent('Inactive since Sep 1, 2026')
    expect(screen.getByText('1 asset')).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /prod-api-01/ })).not.toBeInTheDocument()
  })

  it('details show the hardware, exposure, retired flag and every software component', async () => {
    const user = await renderInventory()

    await user.click(await screen.findByRole('button', { name: 'Show details of prod-api-01' }))

    const details = within(screen.getByRole('row', { name: /PowerEdge/ }))
    expect(details.getByText('Dell PowerEdge R640')).toBeInTheDocument()
    expect(details.getByText('Internet-facing')).toBeInTheDocument()
    expect(details.getAllByRole('listitem')).toHaveLength(3)
    expect(details.getByText('internal-billing-agent').parentElement).toHaveTextContent(
      'internal-billing-agentApplicationUnidentified',
    )
    expect(details.getByText('nginx 1.24.0').parentElement).toHaveTextContent('F5 nginx')
    expect(details.getByText('nginx 1.24.0').parentElement).not.toHaveTextContent('Unidentified')

    await user.click(screen.getByRole('button', { name: 'Hide details of prod-api-01' }))
    expect(screen.queryByText('Dell PowerEdge R640')).not.toBeInTheDocument()
  })

  it('details of an asset without hardware or declared exposure say so', async () => {
    const user = await renderInventory()

    await user.click(
      await screen.findByRole('button', { name: 'Show details of analytics-worker-03' }),
    )

    expect(screen.getByText('No hardware recorded')).toBeInTheDocument()
    expect(screen.getByText('Not declared')).toBeInTheDocument()
  })

  it('pages forward and back repeating the filters on every request', async () => {
    const queries = serveTwoPages()
    const user = await renderInventory()
    await screen.findByRole('row', { name: /prod-api-01/ })

    await user.selectOptions(screen.getByLabelText('Type'), 'Server')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('row', { name: /crm-db-primary/ })).toBeInTheDocument()
    expect(screen.getByText('Page 2')).toBeInTheDocument()
    expect(queries[queries.length - 1]).toEqual({ limit: '50', active: 'true', kind: 'server', cursor: 'page-2' })

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByRole('row', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeInTheDocument()
  })

  it('changing a filter drops the cursor and starts again from page one', async () => {
    const queries = serveTwoPages()
    const user = await renderInventory()
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    await screen.findByRole('row', { name: /crm-db-primary/ })

    await user.selectOptions(screen.getByLabelText('Criticality'), 'High')

    expect(await screen.findByRole('row', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeInTheDocument()
    expect(queries[queries.length - 1]).toEqual({ limit: '50', active: 'true', criticality: 'high' })
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

    await user.click(await screen.findByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 1')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /prod-api-01/ })).toBeInTheDocument()
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
    const user = await renderInventory()
    await screen.findByRole('row', { name: /crm-db-primary/ })

    await user.selectOptions(screen.getByLabelText('Type'), 'Server')
    await user.selectOptions(screen.getByLabelText('Type'), 'Virtual Machine')
    await screen.findByRole('row', { name: /analytics-worker-03/ })
    releaseServers()

    await waitFor(() => expect(serversAnswered).toBe(true))
    // One more task lets the client process the late response before checking it was ignored.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getByRole('row', { name: /analytics-worker-03/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /prod-api-01/ })).not.toBeInTheDocument()
  })

  it('shows the empty state when the inventory has no assets', async () => {
    server.use(http.get(apiUrl('/assets'), () => HttpResponse.json(page([], null, 0))))
    await renderInventory()

    expect(await screen.findByText('There are no assets in the inventory.')).toBeInTheDocument()
    expect(screen.getByText('0 assets')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('says no asset matches when the filters exclude every asset', async () => {
    const user = await renderInventory()
    await screen.findByRole('row', { name: /prod-api-01/ })

    await user.selectOptions(screen.getByLabelText('Type'), 'Workstation')

    expect(await screen.findByText('No assets match these filters.')).toBeInTheDocument()
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
    const user = await renderInventory()

    const alert = await screen.findByRole('alert', {}, { timeout: 1000 })
    expect(alert).toHaveTextContent('The server had an internal error. Try again.')
    expect(screen.queryByText('There are no assets in the inventory.')).not.toBeInTheDocument()

    failing = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('row', { name: /prod-api-01/ })).toBeInTheDocument()
  })

  it('says the server is unreachable when the inventory request gets no answer', async () => {
    server.use(http.get(apiUrl('/assets'), () => HttpResponse.error()))
    await renderInventory()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server to load the inventory.',
    )
  })
})
