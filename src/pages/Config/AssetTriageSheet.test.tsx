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

/*
 * The seed's Active Assets that need triage, in queue order: those with an Unknown Exposure, then
 * the other Unclassified ones. core-switch-01 is classified but its Exposure is Unknown;
 * prod-api-01 has an Exposure but is Unclassified.
 */
const NEEDS_TRIAGE = ['analytics-worker-03', 'core-switch-01', 'payments-gateway', 'reporting-batch-01', 'prod-api-01']

async function renderTechStack(user = renderApp) {
  seedSource()
  const session = user()
  await screen.findByRole('option', { name: /prod-api-01/ })
  return session
}

type User = Awaited<ReturnType<typeof renderTechStack>>
type Within = ReturnType<typeof within>

/** The Exposure button of the Asset on screen; only the selected Asset's record shows one. */
function exposureButton(name: string) {
  return within(screen.getByRole('article', { name })).getByRole('button', {
    name: new RegExp(`^Exposure of ${name}:`),
  })
}

async function openSheet(user: User, name: string) {
  await user.click(screen.getByRole('option', { name: new RegExp(name) }))
  await user.click(exposureButton(name))
  return within(await screen.findByRole('dialog', { name: 'Triage Asset' }))
}

async function openQueue(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Triage them' }))
  return within(await screen.findByRole('dialog', { name: 'Triage Assets' }))
}

function exposureSection(sheet: Within) {
  return within(sheet.getByRole('region', { name: 'Exposure' }))
}

function classificationSection(sheet: Within) {
  return within(sheet.getByRole('region', { name: 'Information Classification' }))
}

function sheetOpen() {
  return screen.queryByRole('dialog', { name: /Triage/ }) !== null
}

function toasts() {
  return within(screen.getByRole('region', { name: 'Notifications' }))
}

/** Changes the stored Asset the way an Exposure Declaration that committed would. */
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

/** Changes the stored Asset the way clearing its Exposure Declaration would. */
function clearInStore(name: string) {
  assetsStore.save(
    assetsStore.load().map((a) => (a.name === name ? { ...a, exposure: importedExposure(a.exposure.imported) } : a)),
  )
}

describe('Asset triage', () => {
  it('counts the Unknown Exposures and the Unclassified on every page, an Asset missing both once', async () => {
    const [prodApi, analyticsWorker, , coreSwitch] = mockAssets
    const counted: Record<string, string>[] = []
    server.use(
      http.get(apiUrl('/assets'), ({ request }) => {
        const params = new URL(request.url).searchParams
        if (params.get('limit') !== '200') return undefined
        counted.push(Object.fromEntries(params))
        const page: AssetsPage = params.has('information_classification')
          ? { assets: [prodApi, analyticsWorker], next_cursor: null, total: 2 }
          : params.get('cursor') === 'page-2'
            ? { assets: [coreSwitch], next_cursor: null, total: 2 }
            : { assets: [analyticsWorker], next_cursor: 'page-2', total: 2 }
        return HttpResponse.json(page)
      }),
    )
    await renderTechStack()

    // analytics-worker-03 has neither value, so both requests return it.
    expect(await screen.findByText('3 Assets need triage.')).toBeInTheDocument()
    expect(counted).toEqual(
      expect.arrayContaining([
        { active: 'true', limit: '200', exposure: 'unknown' },
        { active: 'true', limit: '200', exposure: 'unknown', cursor: 'page-2' },
        { active: 'true', limit: '200', information_classification: 'unclassified' },
      ]),
    )
    expect(counted).toHaveLength(3)
  })

  it('walks Assets missing either value with Next, then sums up the ones where something was saved', async () => {
    const user = await renderTechStack()
    const sheet = await openQueue(user)

    expect(sheet.getByText('1 of 5')).toBeInTheDocument()
    expect(sheet.getByText(NEEDS_TRIAGE[0])).toBeInTheDocument()
    await user.click(exposureSection(sheet).getByRole('radio', { name: /Internet-facing/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Exposure' }))
    expect(await exposureSection(sheet).findByRole('status')).toHaveTextContent('Saved')
    expect(sheet.getByText('1 of 5')).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Next' }))

    // Classified, but its Exposure is Unknown.
    expect(await sheet.findByText('2 of 5')).toBeInTheDocument()
    expect(sheet.getByText(NEEDS_TRIAGE[1])).toBeInTheDocument()
    expect(classificationSection(sheet).getByText(/^Public, declared by admin@barbattack\.example on /)).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Next' }))
    expect(await sheet.findByText('3 of 5')).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Next' }))
    expect(await sheet.findByText('4 of 5')).toBeInTheDocument()
    await user.click(sheet.getByRole('button', { name: 'Next' }))

    // Its Exposure is known: only its Information Classification is missing.
    expect(await sheet.findByText('5 of 5')).toBeInTheDocument()
    expect(sheet.getByText(NEEDS_TRIAGE[4])).toBeInTheDocument()
    expect(exposureSection(sheet).getByText('Internet-facing, from its iTop Location.')).toBeInTheDocument()
    await user.click(classificationSection(sheet).getByRole('radio', { name: /^Confidential/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Classification' }))
    expect(await classificationSection(sheet).findByRole('status')).toHaveTextContent('Saved')
    await user.click(sheet.getByRole('button', { name: 'Next' }))

    expect(await sheet.findByText('2 of 5 Assets triaged')).toBeInTheDocument()
    expect(sheet.getByText(/Where you declared an Exposure, open Findings were rescored/)).toBeInTheDocument()
    expect(sheet.getByText(/The ones you moved past still show Unknown or Unclassified/)).toBeInTheDocument()
    // Each save is confirmed by its Saved mark, not by a toast.
    expect(toasts().queryByText(/Declared/)).not.toBeInTheDocument()
    // prod-api-01 is done; analytics-worker-03 is still Unclassified.
    expect(await screen.findByText('4 Assets need triage.')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(sheetOpen()).toBe(false))
  })

  it('names the unsaved choices in the queue footer before Next', async () => {
    const user = await renderTechStack()
    const sheet = await openQueue(user)
    expect(sheet.queryByText(/not saved/)).not.toBeInTheDocument()

    await user.click(exposureSection(sheet).getByRole('radio', { name: /Internal/ }))
    expect(sheet.getByText('Exposure not saved')).toBeInTheDocument()
    await user.click(classificationSection(sheet).getByRole('radio', { name: /Private/ }))
    expect(sheet.getByText('Exposure and Information Classification not saved')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Declare Classification' }))
    expect(await sheet.findByText('Exposure not saved')).toBeInTheDocument()
  })

  it('saving a section keeps the sheet open on the Asset, with its Saved mark and new provenance', async () => {
    const user = await renderTechStack()
    const sheet = await openSheet(user, 'prod-api-01')
    const exposure = exposureSection(sheet)
    expect(exposure.getByRole('button', { name: 'Declare Exposure' })).toBeDisabled()

    await user.click(exposure.getByRole('radio', { name: /Internal/ }))
    expect(exposure.getByText(/Internal lowers the Score of every open Finding/)).toBeInTheDocument()
    await user.click(exposure.getByRole('button', { name: 'Declare Exposure' }))

    expect(await exposure.findByRole('status')).toHaveTextContent('Saved')
    expect(exposure.getByText(/^Internal, declared by admin@barbattack\.example on /)).toBeInTheDocument()
    expect(exposure.getByRole('button', { name: 'Declare Exposure' })).toBeDisabled()
    expect(classificationSection(sheet).getByRole('status')).toBeEmptyDOMElement()
    expect(sheetOpen()).toBe(true)
    expect(toasts().queryByText(/Declared/)).not.toBeInTheDocument()

    // iTop gives a value, so clearing goes back to it.
    await user.click(exposure.getByRole('button', { name: "Use iTop's (Internet-facing)" }))
    await waitFor(() => expect(exposure.queryByRole('button', { name: /Use iTop's/ })).not.toBeInTheDocument())
    expect(exposure.getByText('Nothing declared.')).toBeInTheDocument()
    expect(exposure.getByRole('radio', { name: /Internal/ })).not.toBeChecked()
    expect(sheetOpen()).toBe(true)
  })

  it('a Customer Admin declares and clears the Information Classification apart from the Exposure', async () => {
    const user = await renderTechStack()
    const sheet = await openSheet(user, 'prod-api-01')
    const classification = classificationSection(sheet)
    expect(
      classification.getByText('iTop has no field for it, so only a declaration sets it.'),
    ).toBeInTheDocument()
    expect(classification.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()

    await user.click(classification.getByRole('radio', { name: /Private/ }))
    await user.click(classification.getByRole('button', { name: 'Declare Classification' }))
    expect(
      await classification.findByText(/^Private, declared by admin@barbattack\.example on /),
    ).toBeInTheDocument()
    expect(await screen.findByText('4 Assets need triage.')).toBeInTheDocument()

    await user.click(classification.getByRole('button', { name: 'Clear' }))
    expect(
      await classification.findByText('iTop has no field for it, so only a declaration sets it.'),
    ).toBeInTheDocument()
    expect(classification.getByRole('radio', { name: /Private/ })).not.toBeChecked()
    expect(exposureSection(sheet).getByRole('status')).toBeEmptyDOMElement()
    expect(await screen.findByText('5 Assets need triage.')).toBeInTheDocument()
  })

  it('offers Highly Confidential first, says what it means, and declares it', async () => {
    const user = await renderTechStack()
    const sheet = await openSheet(user, 'prod-api-01')
    const classification = classificationSection(sheet)

    const radios = classification.getAllByRole('radio').map((r) => r.getAttribute('value'))
    expect(radios).toEqual(['highly_confidential', 'confidential', 'private', 'public'])
    expect(
      classification.getByText(
        'Its data is regulated or secret and a leak would be grave: health records, card data or credentials.',
      ),
    ).toBeInTheDocument()

    await user.click(classification.getByRole('radio', { name: /^Highly Confidential/ }))
    await user.click(classification.getByRole('button', { name: 'Declare Classification' }))

    expect(
      await classification.findByText(/^Highly Confidential, declared by admin@barbattack\.example on /),
    ).toBeInTheDocument()
    expect(assetsStore.load().find((a) => a.name === 'prod-api-01')?.information_classification.value).toBe(
      'highly_confidential',
    )
  })

  it('clearing the Information Classification of an Asset with a known Exposure adds it to the count', async () => {
    const user = await renderTechStack()
    expect(await screen.findByText('5 Assets need triage.')).toBeInTheDocument()

    const sheet = await openSheet(user, 'ledger-db')
    const classification = classificationSection(sheet)
    expect(classification.getByText('Confidential, declared by admin@barbattack.example on Nov 3, 2026.')).toBeInTheDocument()
    expect(classification.getByRole('radio', { name: /^Confidential/ })).toBeChecked()
    await user.click(classification.getByRole('button', { name: 'Clear' }))

    expect(await screen.findByText('6 Assets need triage.')).toBeInTheDocument()
  })

  it("clearing an Exposure that iTop doesn't give leaves it Unknown", async () => {
    const user = await renderTechStack()

    const sheet = await openSheet(user, 'ledger-db')
    const exposure = exposureSection(sheet)
    expect(exposure.getByText('Internal, declared by admin@barbattack.example on Nov 3, 2026.')).toBeInTheDocument()
    await user.click(exposure.getByRole('button', { name: 'Clear' }))
    expect(await exposure.findByText('Nothing declared.')).toBeInTheDocument()

    await user.click(sheet.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(sheetOpen()).toBe(false))
    expect(exposureButton('ledger-db')).toHaveAccessibleName('Exposure of ledger-db: Unknown, from iTop')
    expect(screen.getByText('6 Assets need triage.')).toBeInTheDocument()
  })

  it('a failed save of one section leaves the other untouched', async () => {
    server.use(
      http.put(apiUrl('/assets/:id/information-classification'), () =>
        failure(500, 'internal_error', 'database down'),
      ),
    )
    const user = await renderTechStack()
    const sheet = await openSheet(user, 'analytics-worker-03')
    const exposure = exposureSection(sheet)
    const classification = classificationSection(sheet)

    await user.click(exposure.getByRole('radio', { name: /Internet-facing/ }))
    await user.click(exposure.getByRole('button', { name: 'Declare Exposure' }))
    expect(await exposure.findByRole('status')).toHaveTextContent('Saved')

    await user.click(classification.getByRole('radio', { name: /^Confidential/ }))
    await user.click(classification.getByRole('button', { name: 'Declare Classification' }))

    expect(await classification.findByRole('alert')).toHaveTextContent("Couldn't save it. Nothing changed; try again.")
    expect(classification.getByRole('radio', { name: /^Confidential/ })).toBeChecked()
    expect(exposure.queryByRole('alert')).not.toBeInTheDocument()
    expect(exposure.getByRole('status')).toHaveTextContent('Saved')
    expect(exposure.getByRole('radio', { name: /Internet-facing/ })).toBeChecked()
    expect(exposure.getByText(/^Internet-facing, declared by /)).toBeInTheDocument()

    await user.click(classification.getByRole('radio', { name: /Private/ }))
    expect(classification.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('the Information Classification in the record opens the sheet for its Asset', async () => {
    const user = await renderTechStack()
    await user.click(screen.getByRole('option', { name: /core-switch-01/ }))

    await user.click(screen.getByRole('button', { name: 'Information Classification of core-switch-01: Public' }))

    const sheet = within(await screen.findByRole('dialog', { name: 'Triage Asset' }))
    expect(sheet.getByText('core-switch-01')).toBeInTheDocument()
    expect(classificationSection(sheet).getByRole('radio', { name: /Public/ })).toBeChecked()
  })

  it('a Viewer sees both values and who declared them, with no way to change them', async () => {
    const user = await renderTechStack(() => renderApp('/', VIEWER))

    expect(await screen.findByText('5 Assets need triage.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Triage them' })).not.toBeInTheDocument()

    const sheet = await openSheet(user, 'ledger-db')
    expect(exposureSection(sheet).getByText(/^Internal, declared by admin@barbattack\.example on /)).toBeInTheDocument()
    expect(
      classificationSection(sheet).getByText(/^Confidential, declared by admin@barbattack\.example on /),
    ).toBeInTheDocument()
    expect(
      sheet.getByText('Only a Customer Admin can declare an Exposure or an Information Classification.'),
    ).toBeInTheDocument()
    expect(sheet.queryByRole('radio')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: /Declare|Clear|Use iTop's/ })).not.toBeInTheDocument()
  })

  it('an Inactive Asset cannot be declared', async () => {
    const user = await renderTechStack()
    await user.selectOptions(screen.getByLabelText('Status'), 'Inactive')

    await user.click(await screen.findByRole('button', { name: /^Exposure of erp-app-02:/ }))

    const sheet = within(await screen.findByRole('dialog', { name: 'Triage Asset' }))
    expect(
      sheet.getByText(
        "barbattack doesn't monitor Inactive Assets, so their Exposure and Information Classification can't be declared.",
      ),
    ).toBeInTheDocument()
    expect(sheet.queryByRole('radio')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: /Declare/ })).not.toBeInTheDocument()
  })

  it('an Asset that turned Inactive while one section saved locks both, in place of the reason', async () => {
    server.use(
      http.put(apiUrl('/assets/:id/information-classification'), () => {
        assetsStore.save(assetsStore.load().map((a) => (a.name === NEEDS_TRIAGE[0] ? { ...a, active: false } : a)))
        return failure(409, 'asset_inactive', 'asset is inactive')
      }),
    )
    const user = await renderTechStack()
    const sheet = await openQueue(user)

    await user.click(classificationSection(sheet).getByRole('radio', { name: /Public/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Classification' }))

    expect(
      await sheet.findByText(
        "This Asset just turned Inactive, so its Exposure and Information Classification can't be declared.",
      ),
    ).toBeInTheDocument()
    expect(sheet.queryByText(/doesn't monitor Inactive Assets/)).not.toBeInTheDocument()
    expect(sheet.queryByRole('radio')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: /Declare/ })).not.toBeInTheDocument()
    // The inventory refetched: the Asset left the Active list.
    await waitFor(() => expect(screen.queryByRole('option', { name: /prod-api-01/ })).not.toBeInTheDocument())

    await user.click(sheet.getByRole('button', { name: 'Next' }))
    expect(await sheet.findByText('2 of 5')).toBeInTheDocument()
  })

  it('a server error after the Declaration committed is a saved change whose Findings wait for the next Sync', async () => {
    server.use(
      http.put(apiUrl('/assets/:id/exposure'), () => {
        declareInStore('analytics-worker-03', 'internet_facing')
        return failure(500, 'internal_error', 'rescore failed')
      }),
    )
    const user = await renderTechStack()

    const sheet = await openSheet(user, 'analytics-worker-03')
    await user.click(exposureSection(sheet).getByRole('radio', { name: /Internet-facing/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Exposure' }))

    expect(
      await toasts().findByText(
        "Declared analytics-worker-03 Internet-facing, but its Findings couldn't be rescored. Their Scores update at the next Sync.",
      ),
    ).toBeInTheDocument()
    expect(exposureSection(sheet).getByRole('status')).toHaveTextContent('Saved')
    expect(sheetOpen()).toBe(true)
  })

  it('a server error after clearing committed says the Asset is back to iTop, with its Findings pending', async () => {
    server.use(
      http.delete(apiUrl('/assets/:id/exposure'), () => {
        clearInStore('ledger-db')
        return failure(500, 'internal_error', 'rescore failed')
      }),
    )
    const user = await renderTechStack()

    const sheet = await openSheet(user, 'ledger-db')
    await user.click(exposureSection(sheet).getByRole('button', { name: 'Clear' }))

    expect(
      await toasts().findByText(
        "ledger-db is back to iTop's Exposure (Unknown), but its Findings couldn't be rescored. Their Scores update at the next Sync.",
      ),
    ).toBeInTheDocument()
  })

  it('a server error that saved nothing keeps the choice and asks to try again', async () => {
    server.use(http.put(apiUrl('/assets/:id/exposure'), () => failure(500, 'internal_error', 'database down')))
    const user = await renderTechStack()

    const sheet = await openSheet(user, 'analytics-worker-03')
    const exposure = exposureSection(sheet)
    await user.click(exposure.getByRole('radio', { name: /Internet-facing/ }))
    await user.click(exposure.getByRole('button', { name: 'Declare Exposure' }))

    expect(await exposure.findByRole('alert')).toHaveTextContent("Couldn't save it. Nothing changed; try again.")
    expect(exposure.getByRole('radio', { name: /Internet-facing/ })).toBeChecked()
    expect(exposure.getByRole('status')).toBeEmptyDOMElement()
    expect(toasts().queryByText(/Declared/)).not.toBeInTheDocument()

    await user.click(exposure.getByRole('radio', { name: /Internal/ }))
    expect(exposure.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a save that lands after the other section saved keeps that section as saved', async () => {
    let release!: () => void
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    // Answers with the Asset as it was when the request arrived, before the classification was saved.
    server.use(
      http.put(apiUrl('/assets/:id/exposure'), async ({ params }) => {
        const before = assetsStore.load().find((a) => a.id === Number(params['id']))!
        await released
        return HttpResponse.json<Asset>({
          ...before,
          exposure: {
            ...before.exposure,
            value: 'internal',
            source: 'declared',
            declared_by: 'admin@barbattack.example',
            declared_at: new Date().toISOString(),
          },
        })
      }),
    )
    const user = await renderTechStack()
    const sheet = await openSheet(user, 'prod-api-01')

    await user.click(exposureSection(sheet).getByRole('radio', { name: /Internal/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Exposure' }))
    await user.click(classificationSection(sheet).getByRole('radio', { name: /^Confidential/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Classification' }))
    expect(await classificationSection(sheet).findByText(/^Confidential, declared by /)).toBeInTheDocument()

    release()
    expect(await exposureSection(sheet).findByRole('status')).toHaveTextContent('Saved')
    expect(exposureSection(sheet).getByText(/^Internal, declared by /)).toBeInTheDocument()
    expect(classificationSection(sheet).getByText(/^Confidential, declared by /)).toBeInTheDocument()
  })

  it('while a section saves, its own controls and Next wait, and the other section does not', async () => {
    const release = holdRequests('put', '/assets/:id/exposure')
    const user = await renderTechStack()
    const sheet = await openQueue(user)

    await user.click(exposureSection(sheet).getByRole('radio', { name: /Internal/ }))
    await user.click(sheet.getByRole('button', { name: 'Declare Exposure' }))

    expect(sheet.getByRole('button', { name: 'Declaring…' })).toHaveAttribute('aria-busy', 'true')
    expect(exposureSection(sheet).getByRole('radio', { name: /Internet-facing/ })).toBeDisabled()
    expect(sheet.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(classificationSection(sheet).getByRole('radio', { name: /Public/ })).toBeEnabled()

    release()
    expect(await exposureSection(sheet).findByRole('status')).toHaveTextContent('Saved')
    expect(sheet.getByText('1 of 5')).toBeInTheDocument()
  })
})
