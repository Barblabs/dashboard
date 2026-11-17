import { z } from 'zod'
import type { NewsDigest, NewsItem } from '../api/newsDigests'
import { localStore } from './localStore'
import { newsDigestSchema } from './news-digests-schema'

/*
 * News Digests as GET /news-digests/{id} answers them, for the Customer of the other mocks:
 * a payments company in Mexico and Colombia whose Business Context states financial services
 * and retail, the domain acme.example, the brand ACME Pay, AWS, Microsoft 365 and Salesforce.
 * Labels and reasons are written as barbackend's code writes them (internal/news).
 */

const PEER_LABEL = 'Ataque a una organización de su sector: es contexto, no indica que ustedes estén expuestos.'

function leakClaim(attacker: string) {
  return `Reclamado por ${attacker} en su sitio de filtración: es lo que dice el atacante, sin confirmar.`
}

const NAMED_LEAK: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e01',
  feed: 'ransomwarelive',
  kind: 'leak_post',
  title: 'ACME Pay',
  link: 'https://www.ransomware.live/id/QUNNRSBQYXlAbWVkdXNh',
  language: 'en',
  published_at: '2026-11-17T03:40:00Z',
  summary: null,
  excerpt:
    'ACME Pay, payment processing company based in Mexico. 412 GB of data: customer records, card transactions and internal documents. Publication in 6 days.',
  labels: [leakClaim('Medusa')],
  reasons: ['La víctima, «ACME Pay», usa su dominio acme.example.', 'La víctima, «ACME Pay», lleva su marca «ACME Pay».'],
  why: 'El atacante dice tener transacciones con tarjeta: si es cierto, quedarían expuestos datos de tarjetas de pago que ustedes procesan bajo PCI DSS.',
  context_evidence: [
    { path: '/operations/data_categories/0', value: 'payment_cards' },
    { path: '/operations/regulations/0', value: 'pci_dss' },
  ],
  attacks: [
    {
      victim: 'ACME Pay',
      domain: 'acme.example',
      sectors: ['financial-services'],
      countries: ['MX'],
      kind: 'ransomware',
      attacker: 'Medusa',
    },
  ],
  cve_ids: [],
}

const FINDING_ARTICLE: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e02',
  feed: 'thehackernews',
  kind: 'article',
  title: 'PostgreSQL libpq Flaw CVE-2025-1094 Now Exploited in SQL Injection Attacks',
  link: 'https://thehackernews.com/2026/11/postgresql-libpq-flaw-cve-2025-1094.html',
  language: 'en',
  published_at: '2026-11-16T15:20:00Z',
  summary:
    'Atacantes explotan CVE-2025-1094 en PostgreSQL para inyectar SQL en aplicaciones que pasan datos a psql; ya circula una prueba de concepto pública.',
  excerpt: null,
  labels: [],
  reasons: ['Menciona CVE-2025-1094, abierta en pg-prod-01.'],
  why: 'pg-prod-01 corre Pagos en línea, que no tolera más de 4 horas sin servicio, y la noticia dice que la vulnerabilidad ya se explota.',
  context_evidence: [
    { path: '/operations/critical_services/0/name', value: 'Pagos en línea' },
    { path: '/operations/critical_services/0/max_downtime', value: '1h_4h' },
  ],
  attacks: [],
  cve_ids: ['CVE-2025-1094'],
}

const FOOTPRINT_SALESFORCE: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e03',
  feed: 'securityweek',
  kind: 'article',
  title: 'Salesforce Instances Hit in Data Theft Campaign Abusing Connected Apps',
  link: 'https://www.securityweek.com/salesforce-instances-hit-in-data-theft-campaign/',
  language: 'en',
  published_at: '2026-11-16T18:05:00Z',
  summary:
    'Un grupo de extorsión roba datos de instancias de Salesforce de varias empresas engañando a sus empleados para que autoricen una aplicación conectada maliciosa.',
  excerpt: null,
  labels: [],
  reasons: ['Menciona «Salesforce», una de las tecnologías de su contexto empresarial.'],
  why: 'Ustedes usan Salesforce y el robo de datos es una de sus preocupaciones; la campaña entra por empleados que autorizan aplicaciones, no por una vulnerabilidad.',
  context_evidence: [
    { path: '/footprint/technologies/2', value: 'Salesforce' },
    { path: '/risk/concerns/3', value: 'data_theft' },
  ],
  attacks: [
    { victim: '', domain: null, sectors: ['technology', 'retail'], countries: [], kind: 'data_theft', attacker: 'ShinyHunters' },
  ],
  cve_ids: [],
}

const FOOTPRINT_NGINX: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e04',
  feed: 'unaaldia',
  kind: 'article',
  title: 'Vulnerabilidad crítica en nginx permite la ejecución remota de código',
  link: 'https://unaaldia.hispasec.com/2026/11/vulnerabilidad-critica-en-nginx.html',
  language: 'es',
  published_at: '2026-11-16T09:30:00Z',
  summary:
    'Una vulnerabilidad en el resolvedor DNS de nginx permite ejecutar código en el servidor; la versión 1.27.4 la corrige.',
  excerpt: null,
  labels: [],
  reasons: ['Menciona nginx, que corre en prod-api-01.'],
  why: 'nginx atiende el tráfico de prod-api-01, el servidor de la API de producción.',
  context_evidence: [],
  attacks: [],
  cve_ids: ['CVE-2026-32011'],
}

const PEER_LEAK: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e05',
  feed: 'ransomwarelive',
  kind: 'leak_post',
  title: 'Banco Regional del Norte',
  link: 'https://www.ransomware.live/id/QmFuY28gUmVnaW9uYWxAcmFuc29taHVi',
  language: 'en',
  published_at: '2026-11-16T22:10:00Z',
  summary: null,
  excerpt: 'Banco Regional del Norte. Sector: Financial Services. Country: Mexico. Data: 200 GB.',
  labels: [leakClaim('RansomHub'), PEER_LABEL],
  reasons: [
    'Ataque a «Banco Regional del Norte» (MX), de su sector: servicios financieros. Opera en uno de sus países. Es un tipo de ataque que les preocupa: ransomware y extorsión.',
  ],
  why: 'Es un banco que opera en México, como ustedes: muestra qué grupos están activos contra su sector.',
  context_evidence: [{ path: '/geography/countries/0', value: 'MX' }],
  attacks: [
    {
      victim: 'Banco Regional del Norte',
      domain: 'bancoregionalnorte.example',
      sectors: ['financial-services'],
      countries: ['MX'],
      kind: 'ransomware',
      attacker: 'RansomHub',
    },
  ],
  cve_ids: [],
}

const PEER_ARTICLE: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e06',
  feed: 'therecord',
  kind: 'article',
  title: 'Colombian payments firm discloses two-week breach of card data',
  link: 'https://therecord.media/colombia-payments-firm-card-data-breach',
  language: 'en',
  published_at: '2026-11-16T13:45:00Z',
  summary:
    'Una empresa de pagos de Colombia informó que atacantes accedieron durante dos semanas a datos de tarjetas de sus clientes.',
  excerpt: null,
  labels: [PEER_LABEL],
  reasons: [
    'Ataque a «PagosYa» (CO), de su sector: servicios financieros. Opera en uno de sus países. Es un tipo de ataque que les preocupa: robo de datos.',
  ],
  why: 'PagosYa procesa tarjetas en Colombia, donde ustedes también operan.',
  context_evidence: [{ path: '/geography/countries/1', value: 'CO' }],
  attacks: [
    { victim: 'PagosYa', domain: null, sectors: ['financial-services'], countries: ['CO'], kind: 'data_theft', attacker: null },
  ],
  cve_ids: [],
}

const PEER_PHISHING: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e07',
  feed: 'welivesecurity',
  kind: 'article',
  title: 'Campaña de phishing suplanta a tiendas en línea durante el Buen Fin',
  link: 'https://www.welivesecurity.com/es/estafas-enganos/phishing-buen-fin-tiendas-en-linea/',
  language: 'es',
  published_at: '2026-11-16T11:00:00Z',
  summary:
    'Sitios falsos que imitan a tiendas en línea mexicanas piden datos de tarjeta con descuentos del Buen Fin.',
  excerpt: null,
  labels: [PEER_LABEL],
  reasons: ['Ataque a organizaciones (MX), de su sector: comercio minorista. Opera en uno de sus países.'],
  why: 'La campaña suplanta a comercios como los que cobran con ustedes, en temporada alta.',
  context_evidence: [],
  attacks: [{ victim: '', domain: null, sectors: ['retail'], countries: ['MX'], kind: 'phishing', attacker: null }],
  cve_ids: [],
}

// The day before: the Editor failed, so the items keep the rules' order and have no why.
const OLDER_FOOTPRINT: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e08',
  feed: 'darkreading',
  kind: 'article',
  title: 'Attackers Abuse Leaked AWS Keys to Deploy Cryptominers',
  link: 'https://www.darkreading.com/cloud-security/attackers-abuse-leaked-aws-keys-cryptominers',
  language: 'en',
  published_at: '2026-11-15T16:00:00Z',
  summary: 'Atacantes usan llaves de acceso de AWS publicadas por error en repositorios para lanzar instancias que minan criptomonedas.',
  excerpt: null,
  labels: [],
  reasons: ['Menciona «AWS», una de las tecnologías de su contexto empresarial.'],
  why: null,
  context_evidence: [],
  attacks: [],
  cve_ids: [],
}

const OLDER_PEER: NewsItem = {
  news_item_id: 'report--4d6c1a8e-2b7f-5c90-9e13-0a1b2c3d4e09',
  feed: 'securityweek',
  kind: 'article',
  title: 'Ransomware Attack Disrupts Operations at Peruvian Retailer Tiendas Sol',
  link: 'https://www.securityweek.com/ransomware-attack-disrupts-peruvian-retailer/',
  language: 'en',
  published_at: '2026-11-15T20:30:00Z',
  summary: 'Un ataque de ransomware detuvo las ventas en línea y las cajas de las tiendas de Tiendas Sol en Perú durante dos días.',
  excerpt: null,
  labels: [PEER_LABEL],
  reasons: [
    'Ataque a «Tiendas Sol» (PE), de su sector: comercio minorista. Es un tipo de ataque que les preocupa: ransomware y extorsión.',
  ],
  why: null,
  context_evidence: [],
  attacks: [
    { victim: 'Tiendas Sol', domain: null, sectors: ['retail'], countries: ['PE'], kind: 'ransomware', attacker: 'Akira' },
  ],
  cve_ids: [],
}

const MOCK_NEWS_DIGESTS: NewsDigest[] = [
  {
    id: '5e2b9c7d-1f3a-4b6c-8d9e-0f1a2b3c4d02',
    created_at: '2026-11-17T12:05:00Z',
    since: '2026-11-16T12:00:00Z',
    until: '2026-11-17T12:00:00Z',
    counts: { named: 1, finding: 1, footprint: 2, peer: 3 },
    business_context_version: 1,
    no_sectors: false,
    editor: { status: 'verified', model: 'claude-haiku-5-5', prompt_id: 'c41d8e2a90b7' },
    groups: [
      { relevance: 'named', items: [NAMED_LEAK] },
      { relevance: 'finding', items: [FINDING_ARTICLE] },
      { relevance: 'footprint', items: [FOOTPRINT_SALESFORCE, FOOTPRINT_NGINX] },
      { relevance: 'peer', items: [PEER_LEAK, PEER_ARTICLE, PEER_PHISHING] },
    ],
  },
  {
    id: '5e2b9c7d-1f3a-4b6c-8d9e-0f1a2b3c4d01',
    created_at: '2026-11-16T12:05:00Z',
    since: '2026-11-15T12:00:00Z',
    until: '2026-11-16T12:00:00Z',
    counts: { named: 0, finding: 0, footprint: 1, peer: 1 },
    business_context_version: 1,
    no_sectors: false,
    editor: { status: 'failed', model: 'claude-haiku-5-5', prompt_id: 'c41d8e2a90b7' },
    groups: [
      { relevance: 'footprint', items: [OLDER_FOOTPRINT] },
      { relevance: 'peer', items: [OLDER_PEER] },
    ],
  },
]

/** Newest first, as GET /news-digests lists them. */
export const newsDigestsStore = localStore(
  'barbattack_mock_news_digests',
  z.array(newsDigestSchema),
  MOCK_NEWS_DIGESTS,
)
