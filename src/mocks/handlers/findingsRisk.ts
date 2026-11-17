import { delay, http, HttpResponse } from 'msw'
import { apiUrl } from '../url'

const BREAKDOWN_EXPOSURE = {
  by: 'exposure',
  groups: [
    { value: 'internet_facing', name: null, critical: 5, high: 8, medium: 3, low: 1, unbanded: 0 },
    { value: 'internal', name: null, critical: 1, high: 4, medium: 7, low: 3, unbanded: 0 },
    { value: 'unknown', name: null, critical: 0, high: 1, medium: 2, low: 1, unbanded: 2 },
  ],
}

const BREAKDOWN_CRITICALITY = {
  by: 'criticality',
  groups: [
    { value: 'high', name: null, critical: 4, high: 7, medium: 5, low: 2, unbanded: 0 },
    { value: 'medium', name: null, critical: 2, high: 3, medium: 4, low: 2, unbanded: 0 },
    { value: 'low', name: null, critical: 0, high: 1, medium: 2, low: 1, unbanded: 0 },
    { value: 'unknown', name: null, critical: 0, high: 2, medium: 1, low: 0, unbanded: 2 },
  ],
}

const BREAKDOWN_AREA = {
  by: 'area',
  groups: [
    { value: '1', name: 'Producción', critical: 4, high: 6, medium: 4, low: 1, unbanded: 0 },
    { value: '2', name: 'Desarrollo', critical: 1, high: 2, medium: 3, low: 2, unbanded: 0 },
    { value: 'none', name: null, critical: 1, high: 5, medium: 3, low: 1, unbanded: 2 },
  ],
}

const ASSET_FINDINGS_SUMMARY = {
  assets: [
    { id: 1, name: 'web-prod-01', critical: 3, high: 4, medium: 2, low: 0, unbanded: 0 },
    { id: 2, name: 'db-prod-01', critical: 2, high: 3, medium: 4, low: 1, unbanded: 0 },
    { id: 3, name: 'app-legacy-01', critical: 1, high: 4, medium: 2, low: 2, unbanded: 1 },
    { id: 4, name: 'firewall-01', critical: 0, high: 2, medium: 3, low: 1, unbanded: 0 },
    { id: 5, name: 'ci-runner-01', critical: 0, high: 1, medium: 2, low: 1, unbanded: 0 },
  ],
}

const FINDINGS_TOP = {
  components: [
    { product: 'OpenSSL', vendor: 'OpenSSL Project', version: '1.1.1', findings: 5, assets: 3 },
    { product: 'Log4j', vendor: 'Apache', version: '2.14.1', findings: 4, assets: 2 },
    { product: 'libssl', vendor: 'OpenSSL Project', version: '3.0.7', findings: 3, assets: 2 },
    { product: 'nginx', vendor: 'F5', version: '1.18.0', findings: 2, assets: 2 },
    { product: 'curl', vendor: 'haxx.se', version: '7.88.1', findings: 2, assets: 1 },
    { product: 'python3', vendor: 'PSF', version: '3.9.2', findings: 1, assets: 1 },
    { product: 'bash', vendor: 'GNU', version: '5.1.4', findings: 1, assets: 1 },
  ],
  cves: [
    { cve_id: 'CVE-2021-44228', kev: true, epss: 0.9754, findings: 4, assets: 3 },
    { cve_id: 'CVE-2021-41773', kev: true, epss: 0.9718, findings: 3, assets: 2 },
    { cve_id: 'CVE-2024-21762', kev: true, epss: 0.8862, findings: 2, assets: 2 },
    { cve_id: 'CVE-2022-22965', kev: true, epss: 0.9731, findings: 2, assets: 1 },
    { cve_id: 'CVE-2024-3400', kev: false, epss: 0.6412, findings: 2, assets: 1 },
    { cve_id: 'CVE-2023-23897', kev: false, epss: 0.3215, findings: 1, assets: 1 },
    { cve_id: 'CVE-2023-44487', kev: false, epss: 0.1877, findings: 1, assets: 1 },
  ],
}

export const findingsRiskHandlers = [
  http.get(apiUrl('/findings/breakdown'), async ({ request }) => {
    await delay()
    const by = new URL(request.url).searchParams.get('by') ?? 'exposure'
    if (by === 'criticality') return HttpResponse.json(BREAKDOWN_CRITICALITY)
    if (by === 'area') return HttpResponse.json(BREAKDOWN_AREA)
    return HttpResponse.json(BREAKDOWN_EXPOSURE)
  }),

  http.get(apiUrl('/assets/findings-summary'), async () => {
    await delay()
    return HttpResponse.json(ASSET_FINDINGS_SUMMARY)
  }),

  http.get(apiUrl('/findings/top'), async () => {
    await delay()
    return HttpResponse.json(FINDINGS_TOP)
  }),
]
