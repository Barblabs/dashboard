import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Asset, AssetsPage } from '../../api/assets'
import { importedExposure, mockAssets } from '../../mocks/assets'
import { assetsStore } from '../../mocks/assets-store'
import { failure } from '../../mocks/handlers/responses'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource, VIEWER } from '../../test/render'
import { holdRequests, server } from '../../test/server'

// The seed's Active Assets with Unknown Exposure, in inventory order.
const UNKNOWN = ['analytics-worker-03', 'core-switch-01', 'payments-gateway', 'reporting-batch-01']

function seeded(name: string): Asset {
  const asset = mockAssets.find((a) => a.name === name)
  if (!asset) throw new Error(`no seeded asset ${name}`)
  return asset
}

async function renderTechStack(user = renderApp) {
  seedSource()
  const session = user()
  await screen.findByRole('option', { name: /prod-api-01/ })
  return session
}

type User = Awaited<ReturnType<typeof renderTechStack>>

/** The Exposure button of the Asset on screen; only the selected Asset's record shows one. */
function exposureCell(name: string) {
  return within(screen.getByRole('article', { name })).getByRole('button', {
    name: new RegExp(`^Exposure of ${name}:`),
  })
}

async function openExposure(user: User, name: string) {
  await user.click(screen.getByRole('option', { name: new RegExp(name) }))
  await user.click(exposureCell(name))
}

function sheetOpen() {
  return screen.queryByRole('dialog', { name: /Exposure/ }) !== null
}

function toasts() {
  return within(screen.getByRole('region', { name: 'Notifications' }))
}

/** Changes the stored Asset the way a Declaration that committed would. */
function declareInStore(name: string, exposure: 'internet_facing' | 'internal') {
  assetsStore.save(
    assetsStore.load().map((a) =>
      a.name === name
        ? {
            ...a,
            exposure: {
              ...a.exposure,
              value: exposure,
              source: 'declared',
              declared_by: 'admin@barbattack.example',
              declared_at: new Date().toISOString(),
            },
          }
        : a,
    ),
  )
}

/** Changes the stored Asset the way clearing its Declaration would. */
function clearInStore(name: string) {
  assetsStore.save(
    assetsStore.load().map((a) => (a.name === name ? { ...a, exposure: importedExposure(a.exposure.imported) } : a)),
  )
}

describe('Exposure', () => {
  it('counts the Unknown Exposures of every page of the inventory, not only the one on screen', async () => {
    const [prodApi, analyticsWorker, , coreSwitch] = mockAssets
    const counted: Record<string, string>[] = []
    server.use(
      http.get(apiUrl('/assets'), ({ request }) => {
        const params = new URL(request.url).searchParams
        if (params.get('limit') !== '200') return undefined
        counted.push(Object.fromEntries(params))
        const page: AssetsPage =
          params.get('cursor') === 'page-2'
            ? { assets: [coreSwitch!, seeded('payments-gateway')], next_cursor: null, total: 4 }
            : { assets: [prodApi!, analyticsWorker!], next_cursor: 'page-2', total: 4 }
        return HttpResponse.json(page)
      }),
    )
    await renderTechStack()

    expect(await screen.findByText('3 Active Assets have Unknown Exposure.')).toBeInTheDocument()
    expect(counted).toEqual([
      { active: 'true', limit: '200' },
      { active: 'true', limit: '200', cursor: 'page-2' },
    ])
  })

  it('walks the queue with Skip and progress, then sums up what was answered', async () => {
    const user = await renderTechStack()

    await user.click(await screen.findByRole('button', { name: 'Answer them' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'Answer Unknown Exposures' }))
    expect(sheet.getByText('1 of 4')).toBeInTheDocument()
    expect(sheet.getByText(UNKNOWN[0]!)).toBeInTheDocument()

    await user.click(sheet.getByRole('radio', { name: /Internet-facing/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare and next' }))
    expect(await sheet.findByText('2 of 4')).toBeInTheDocument()
    expect(sheet.getByText(UNKNOWN[1]!)).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Skip' }))
    expect(await sheet.findByText('3 of 4')).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Skip' }))
    expect(await sheet.findByText('4 of 4')).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Skip' }))

    expect(await sheet.findByText('1 of 4 answered')).toBeInTheDocument()
    expect(sheet.getByText(/The ones you skipped still show Unknown in the inventory\./)).toBeInTheDocument()
    // Each answer is confirmed by the progress and the summary, not by a toast.
    expect(toasts().queryByText(/Declared/)).not.toBeInTheDocument()
    expect(await screen.findByText('3 Active Assets have Unknown Exposure.')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(sheetOpen()).toBe(false))
  })

  it('a Customer Admin declares one Asset from its record, which stays selected', async () => {
    const user = await renderTechStack()

    await openExposure(user, 'core-switch-01')
    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    expect(sheet.getByText("Unknown: its iTop Location isn't one barbattack reads.")).toBeInTheDocument()
    expect(sheet.getByRole('button', { name: 'Declare' })).toBeDisabled()

    await user.click(sheet.getByRole('radio', { name: /Internal/ }))
    expect(sheet.getByText(/Internal lowers the Score of every open Finding/)).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Declare' }))

    expect(
      await toasts().findByText('Declared core-switch-01 Internal. Its open Findings were rescored.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(sheetOpen()).toBe(false))
    expect(exposureCell('core-switch-01')).toHaveAccessibleName('Exposure of core-switch-01: Internal, declared')
    expect(screen.getByRole('option', { name: /core-switch-01/ })).toHaveAttribute('aria-selected', 'true')

    await user.click(exposureCell('core-switch-01'))
    const reopened = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    expect(reopened.getByText(/^Internal, declared by admin@barbattack\.example on /)).toBeInTheDocument()
  })

  it("going back to iTop's Exposure clears the Declaration, Unknown included", async () => {
    const user = await renderTechStack()

    await openExposure(user, 'ledger-db')
    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    expect(sheet.getByText('Internal, declared by admin@barbattack.example on Nov 3, 2026.')).toBeInTheDocument()
    expect(sheet.getByRole('radio', { name: /Internal/ })).toBeChecked()
    expect(sheet.getByRole('button', { name: 'Declare' })).toBeDisabled()

    await user.click(sheet.getByRole('button', { name: "Use iTop's (Unknown)" }))

    expect(
      await toasts().findByText("ledger-db is back to iTop's Exposure (Unknown). Its open Findings were rescored."),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(exposureCell('ledger-db')).toHaveAccessibleName('Exposure of ledger-db: Unknown, from iTop'),
    )
    expect(await screen.findByText('5 Active Assets have Unknown Exposure.')).toBeInTheDocument()
  })

  it('a Viewer sees where an Exposure comes from, with no way to declare it', async () => {
    const user = await renderTechStack(() => renderApp('/', VIEWER))

    expect(await screen.findByText('4 Active Assets have Unknown Exposure.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Answer them' })).not.toBeInTheDocument()

    await openExposure(user, 'ledger-db')
    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    expect(sheet.getByText(/^Internal, declared by /)).toBeInTheDocument()
    expect(sheet.getByText('Only a Customer Admin can declare an Exposure.')).toBeInTheDocument()
    expect(sheet.queryByRole('radio')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: /Declare|Use iTop's/ })).not.toBeInTheDocument()
  })

  it('an Inactive Asset cannot be declared', async () => {
    const user = await renderTechStack()
    await user.selectOptions(screen.getByLabelText('Status'), 'Inactive')

    await user.click(await screen.findByRole('button', { name: /^Exposure of erp-app-02:/ }))

    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    expect(
      sheet.getByText("barbattack doesn't monitor Inactive Assets, so their Exposure can't be declared."),
    ).toBeInTheDocument()
    expect(sheet.queryByRole('radio')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: /Declare/ })).not.toBeInTheDocument()
  })

  it('an Asset that turned Inactive meanwhile says the save did not happen, in place of the reason', async () => {
    server.use(
      http.put(apiUrl('/assets/:id/exposure'), () => {
        assetsStore.save(assetsStore.load().map((a) => (a.name === UNKNOWN[0] ? { ...a, active: false } : a)))
        return failure(409, 'asset_inactive', 'asset is inactive')
      }),
    )
    const user = await renderTechStack()

    await user.click(await screen.findByRole('button', { name: 'Answer them' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'Answer Unknown Exposures' }))
    await user.click(sheet.getByRole('radio', { name: /Internal/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare and next' }))

    expect(
      await sheet.findByText("This Asset just turned Inactive, so its Exposure can't be declared."),
    ).toBeInTheDocument()
    expect(sheet.queryByText(/doesn't monitor Inactive Assets/)).not.toBeInTheDocument()
    expect(sheet.queryByRole('radio')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument()
    // The inventory refetched: the Asset left the Active list.
    await waitFor(() => expect(screen.queryByRole('option', { name: /analytics-worker-03/ })).not.toBeInTheDocument())

    await user.click(sheet.getByRole('button', { name: 'Next' }))
    expect(await sheet.findByText('2 of 4')).toBeInTheDocument()
  })

  it('a server error after the Declaration committed is a saved change whose Findings wait for the next Sync', async () => {
    server.use(
      http.put(apiUrl('/assets/:id/exposure'), () => {
        declareInStore('analytics-worker-03', 'internet_facing')
        return failure(500, 'internal_error', 'rescore failed')
      }),
    )
    const user = await renderTechStack()

    await openExposure(user, 'analytics-worker-03')
    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    await user.click(sheet.getByRole('radio', { name: /Internet-facing/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare' }))

    expect(
      await toasts().findByText(
        "Declared analytics-worker-03 Internet-facing, but its Findings couldn't be rescored. Their Scores update at the next Sync.",
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(sheetOpen()).toBe(false))
  })

  it('the queue still warns when a saved answer could not rescore its Findings', async () => {
    server.use(
      http.put(apiUrl('/assets/:id/exposure'), () => {
        declareInStore(UNKNOWN[0]!, 'internal')
        return failure(500, 'internal_error', 'rescore failed')
      }),
    )
    const user = await renderTechStack()

    await user.click(await screen.findByRole('button', { name: 'Answer them' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'Answer Unknown Exposures' }))
    await user.click(sheet.getByRole('radio', { name: /Internal/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare and next' }))

    expect(await sheet.findByText('2 of 4')).toBeInTheDocument()
    expect(
      toasts().getByText(
        "Declared analytics-worker-03 Internal, but its Findings couldn't be rescored. Their Scores update at the next Sync.",
      ),
    ).toBeInTheDocument()
  })

  it('a server error after clearing committed says the Asset is back to iTop, with its Findings pending', async () => {
    server.use(
      http.delete(apiUrl('/assets/:id/exposure'), () => {
        clearInStore('ledger-db')
        return failure(500, 'internal_error', 'rescore failed')
      }),
    )
    const user = await renderTechStack()

    await openExposure(user, 'ledger-db')
    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    await user.click(sheet.getByRole('button', { name: "Use iTop's (Unknown)" }))

    expect(
      await toasts().findByText(
        "ledger-db is back to iTop's Exposure (Unknown), but its Findings couldn't be rescored. Their Scores update at the next Sync.",
      ),
    ).toBeInTheDocument()
  })

  it('a server error that saved nothing keeps the choice and asks to try again', async () => {
    server.use(http.put(apiUrl('/assets/:id/exposure'), () => failure(500, 'internal_error', 'database down')))
    const user = await renderTechStack()

    await openExposure(user, 'analytics-worker-03')
    const sheet = within(await screen.findByRole('dialog', { name: 'Exposure' }))
    await user.click(sheet.getByRole('radio', { name: /Internet-facing/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare' }))

    expect(await sheet.findByRole('alert')).toHaveTextContent("Couldn't save it. Nothing changed; try again.")
    expect(sheet.getByRole('radio', { name: /Internet-facing/ })).toBeChecked()
    expect(toasts().queryByText(/Declared/)).not.toBeInTheDocument()

    await user.click(sheet.getByRole('radio', { name: /Internal/ }))
    expect(sheet.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('while a Declaration is saving, the other controls wait', async () => {
    const release = holdRequests('put', '/assets/:id/exposure')
    const user = await renderTechStack()

    await user.click(await screen.findByRole('button', { name: 'Answer them' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'Answer Unknown Exposures' }))
    await user.click(sheet.getByRole('radio', { name: /Internal/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare and next' }))

    expect(sheet.getByRole('button', { name: 'Declaring…' })).toHaveAttribute('aria-busy', 'true')
    expect(sheet.getByRole('button', { name: 'Skip' })).toBeDisabled()
    expect(sheet.getByRole('radio', { name: /Internet-facing/ })).toBeDisabled()

    release()
    expect(await sheet.findByText('2 of 4')).toBeInTheDocument()
  })
})
