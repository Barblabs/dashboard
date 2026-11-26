import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NewsDigest, NewsItem } from '../../api/newsDigests'
import { newsDigestsStore } from '../../mocks/news-digests-store'
import { renderApp } from '../../test/render'

const PEER_LABEL = 'Ataque a una organización de su sector: es contexto, no indica que ustedes estén expuestos.'

async function renderNews() {
  const testUser = renderApp('/news')
  await screen.findByRole('region', { name: 'Attacks in your sector' })
  return testUser
}

function groups() {
  return within(screen.getByRole('main')).getAllByRole('region')
}

// A title's link also says it opens a new tab, so its heading is named by more than the title.
function article(title: string | RegExp) {
  const found = screen
    .getAllByRole('article')
    .find((a) => {
      const heading = within(a).getByRole('heading', { level: 3 }).textContent ?? ''
      return typeof title === 'string' ? heading.startsWith(title) : title.test(heading)
    })
  if (!found) throw new Error(`no article for ${String(title)}`)
  return found
}

// Intl separates the dates of a period with thin spaces.
function plain(text: string | null) {
  return (text ?? '').replace(/\s+/g, ' ')
}

/** Changes one item of the newest stored digest, before the app reads it. */
function storeItem(title: string, change: (item: NewsItem) => NewsItem) {
  const [newest, ...older] = newsDigestsStore.load()
  const changed: NewsDigest = {
    ...newest,
    groups: newest.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.title === title ? change(i) : i)) })),
  }
  newsDigestsStore.save([changed, ...older])
}

function storeNewest(change: (digest: NewsDigest) => NewsDigest) {
  const [newest, ...older] = newsDigestsStore.load()
  newsDigestsStore.save([change(newest), ...older])
}

describe('News', () => {
  it('opens the newest digest with its groups closest first, peers last', async () => {
    await renderNews()

    expect(groups().map((g) => within(g).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'They name you',
      'They mention vulnerabilities open on your assets',
      'They mention technology or suppliers you use',
      'Attacks in your sector',
    ])
    expect(within(groups()[3]).getByText('It does not mean you are exposed.')).toBeInTheDocument()
    expect(screen.getByText('News from Nov 16 – 17, 2026')).toBeInTheDocument()
    expect(screen.getByText('Weighed with business context v1')).toBeInTheDocument()
    const counts = screen.getByRole('list', { name: 'News by relevance' })
    expect(within(counts).getAllByRole('listitem').map((c) => c.textContent)).toEqual([
      'Your name 1',
      'Open vulnerabilities 1',
      'Technology and suppliers 2',
      'Your sector 3',
    ])
    expect(screen.queryByText(/The summary for this digest couldn't be written/)).not.toBeInTheDocument()
  })

  it('shows the labels the backend wrote, as written, on every item that has them', async () => {
    await renderNews()

    const peers = within(groups()[3]).getAllByRole('article')
    expect(peers).toHaveLength(3)
    for (const peer of peers) {
      expect(within(within(peer).getByRole('list', { name: 'Notices' })).getByText(PEER_LABEL)).toBeInTheDocument()
    }
    const leak = article('ACME Pay')
    expect(within(leak).getByText('Leak-site post')).toBeInTheDocument()
    expect(
      within(leak).getByText('Reclamado por Medusa en su sitio de filtración: es lo que dice el atacante, sin confirmar.'),
    ).toBeInTheDocument()
    expect(within(article(/PostgreSQL libpq Flaw/)).queryByRole('list', { name: 'Notices' })).not.toBeInTheDocument()
  })

  it("shows the Editor's why with what it cites from the business context, the summary and the rules' reasons", async () => {
    await renderNews()

    const item = article(/PostgreSQL libpq Flaw/)
    expect(within(item).getByText('Why it may matter to you')).toBeInTheDocument()
    expect(within(item).getByText(/pg-prod-01 corre Pagos en línea/)).toBeInTheDocument()
    const evidence = within(item).getByRole('list', { name: 'From your business context' })
    expect(within(evidence).getByTitle('/operations/critical_services/0/name')).toHaveTextContent('Critical servicePagos en línea')
    expect(within(item).getByText(/Atacantes explotan CVE-2025-1094 en PostgreSQL/)).toBeInTheDocument()
    expect(within(item).queryByText('Original text')).not.toBeInTheDocument()
    const reasons = within(item).getByRole('list', { name: 'Why it appears' })
    expect(within(reasons).getByRole('listitem')).toHaveTextContent('Menciona CVE-2025-1094, abierta en pg-prod-01.')
    expect(within(within(item).getByRole('list', { name: 'CVEs' })).getByText('CVE-2025-1094')).toBeInTheDocument()
  })

  it('names the business context field each piece of evidence comes from', async () => {
    await renderNews()

    const evidence = within(article('ACME Pay')).getByRole('list', { name: 'From your business context' })
    expect(within(evidence).getByTitle('/operations/data_categories/0')).toHaveTextContent('Data it holdspayment_cards')
    expect(within(evidence).getByTitle('/operations/regulations/0')).toHaveTextContent('Regulations and standardspci_dss')
  })

  it('shows the original text of an item with no summary, marked as such', async () => {
    await renderNews()

    const leak = article('ACME Pay')
    const original = within(leak).getByText('Original text').closest('figure')
    if (!original) throw new Error('no figure around the original text')
    expect(within(original).getByText(/412 GB of data/).tagName).toBe('BLOCKQUOTE')
  })

  it('shows neither summary nor original text when an item has none, and no why when the Editor gave none', async () => {
    storeItem('Vulnerabilidad crítica en nginx permite la ejecución remota de código', (i) => ({
      ...i,
      summary: null,
      excerpt: null,
      why: null,
    }))
    await renderNews()

    const item = article('Vulnerabilidad crítica en nginx permite la ejecución remota de código')
    expect(within(item).queryByText('Why it may matter to you')).not.toBeInTheDocument()
    expect(within(item).queryByText('Original text')).not.toBeInTheDocument()
    expect(within(item).getByRole('list', { name: 'Why it appears' })).toHaveTextContent('Menciona nginx, que corre en prod-api-01.')
  })

  it('shows the attacks a source reports as compact facts in the UI language', async () => {
    await renderNews()

    const attacks = within(article('Banco Regional del Norte')).getByRole('list', { name: 'Attacks the source reports' })
    expect(within(attacks).getByRole('listitem')).toHaveTextContent(
      'Banco Regional del Norte (bancoregionalnorte.example) · Financial services · Mexico · Ransomware and extortion · Attacker: RansomHub',
    )
    const unnamed = within(article(/Salesforce Instances Hit/)).getByRole('list', { name: 'Attacks the source reports' })
    expect(within(unnamed).getByRole('listitem')).toHaveTextContent(
      'Unnamed victim · Technology, Retail · Data theft · Attacker: ShinyHunters',
    )
  })

  it('links each title to its source in a new tab, and nothing else from the feed', async () => {
    await renderNews()

    const item = article(/PostgreSQL libpq Flaw/)
    const link = within(item).getByRole('link', { name: /PostgreSQL libpq Flaw/ })
    expect(link).toHaveAttribute('href', 'https://thehackernews.com/2026/11/postgresql-libpq-flaw-cve-2025-1094.html')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(item).getAllByRole('link')).toHaveLength(1)
    expect(within(item).getByText('Source: The Hacker News')).toBeInTheDocument()
  })

  it('credits Ransomware.live with a link to its site on every item it published', async () => {
    await renderNews()

    for (const title of ['ACME Pay', 'Banco Regional del Norte']) {
      const credit = within(article(title)).getByRole('link', { name: /^Source: Ransomware\.live/ })
      expect(credit).toHaveAttribute('href', 'https://www.ransomware.live')
      expect(credit).toHaveAttribute('target', '_blank')
      expect(credit).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(within(article(/Colombian payments firm/)).queryByRole('link', { name: /Ransomware\.live/ })).not.toBeInTheDocument()
  })

  it('renders what a feed wrote as text, never as markup', async () => {
    storeItem('Banco Regional del Norte', (i) => ({
      ...i,
      title: 'Banco <b>x</b>',
      excerpt: '<img src=x onerror="alert(1)">',
      labels: ['<script>alert(1)</script>'],
      link: 'javascript:alert(1)',
    }))
    await renderNews()

    const item = article('Banco <b>x</b>')
    expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent('Banco <b>x</b>')
    expect(within(item).getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument()
    expect(within(item).getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(item.querySelector('b, img, script')).toBeNull()
    // A URL that is not http or https is no link: the title stays as text.
    expect(within(item).queryByRole('link', { name: /Banco/ })).not.toBeInTheDocument()
  })

  it('opens an earlier digest from the picker and keeps it in the URL', async () => {
    const user = await renderNews()

    await user.selectOptions(screen.getByLabelText('Digest'), screen.getByRole('option', { name: /^Nov 15/ }))

    expect(await screen.findByText(/The summary for this digest couldn't be written/)).toHaveTextContent(
      "The summary for this digest couldn't be written, so the news shows without explanations.",
    )
    expect(window.location.search).toBe(`?digest=${newsDigestsStore.load()[1].id}`)
    expect(groups().map((g) => within(g).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'They mention technology or suppliers you use',
      'Attacks in your sector',
    ])
    expect(screen.queryByText('Why it may matter to you')).not.toBeInTheDocument()
    expect(screen.getAllByText(/The summary for this digest couldn't be written/)).toHaveLength(1)
  })

  it('lists the earlier digests with their period and how many items they hold', async () => {
    await renderNews()

    const options = within(screen.getByLabelText('Digest')).getAllByRole('option')
    expect(options.map((o) => plain(o.textContent))).toEqual([
      'Nov 16 – 17, 2026, 7 news items, 1 names you',
      'Nov 15 – 16, 2026, 2 news items',
    ])
  })

  it('opens the digest a link names', async () => {
    renderApp(`/news?digest=${newsDigestsStore.load()[1].id}`)

    expect(await screen.findByRole('heading', { level: 3, name: /Leaked AWS Keys/ })).toBeInTheDocument()
    expect(screen.getByText('News from Nov 15 – 16, 2026')).toBeInTheDocument()
  })

  it('says when the business context states no sector, so no attack on a Peer can appear', async () => {
    storeNewest((d) => ({ ...d, no_sectors: true }))
    await renderNews()

    expect(
      screen.getByText(/Your business context states no sector, so no attack on an organization of your sector/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'State your sectors' })).toHaveAttribute('href', '/business-context')
  })

  it('explains what makes news arrive before the first digest', async () => {
    newsDigestsStore.save([])
    renderApp('/news')

    expect(await screen.findByText('No news yet')).toBeInTheDocument()
    expect(screen.getByText(/your sectors, domains, brands, technologies and third parties/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the business context' })).toHaveAttribute('href', '/business-context')
    expect(screen.queryByLabelText('Digest')).not.toBeInTheDocument()
  })
})
