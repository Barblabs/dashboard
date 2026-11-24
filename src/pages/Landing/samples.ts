import type { ScoreBand } from '../../api/prioritizations'

export interface SampleFinding {
  cve: string
  asset: string
  component: string
  score: number
  band: ScoreBand
  kev: boolean
}

export const SAMPLE_FINDINGS: readonly SampleFinding[] = [
  { cve: 'CVE-2021-41773', asset: 'web-01', component: 'Apache httpd 2.4.49', score: 98, band: 'critical', kev: true },
  { cve: 'CVE-2023-4966', asset: 'vpn-gw-01', component: 'NetScaler 13.1', score: 91, band: 'critical', kev: true },
  { cve: 'CVE-2024-6387', asset: 'bastion-02', component: 'OpenSSH 9.6p1', score: 57, band: 'high', kev: false },
  { cve: 'CVE-2023-44487', asset: 'api-03', component: 'nginx 1.24.0', score: 31, band: 'medium', kev: true },
  { cve: 'CVE-2022-0778', asset: 'mail-01', component: 'OpenSSL 1.1.1k', score: 12, band: 'low', kev: false },
]
