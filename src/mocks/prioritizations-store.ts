import type { ActionPlan, Finding, Prioritization, PriorityGroup } from '../api/prioritizations'
import { z } from 'zod'
import { localStore } from './localStore'
import { prioritizationSchema } from './prioritizations-schema'

/*
 * 20 findings across 4 agent groups. Original f1–f5 CVE IDs and finding IDs are preserved
 * so that detail-view tests keep working. Score ranks are set to reflect the backend's pure-score
 * order across all 20 findings; agent groups deviate in 6 "subió" and 7 "bajó" cases.
 *
 * Score groups (matching agent group sizes 4/5/6/5):
 *   SG1 ranks 1–4:   f03, fa, fb, fe
 *   SG2 ranks 5–9:   f04, fc, fd, fg, fh
 *   SG3 ranks 10–15: fi, fj, fm, f02, f01, fn
 *   SG4 ranks 16–20: fo, f05, fp, fk, fl
 *
 * Movements (agent_group vs score_group):
 *   Subió  (AG < SG): f04 SG2→AG1, f02 SG3→AG2, f01 SG3→AG2, f05 SG4→AG2, fk SG4→AG3, fl SG4→AG3  → 6
 *   Bajó   (AG > SG): fb SG1→AG2, fd SG2→AG3, fg SG2→AG3, fh SG2→AG3, fj SG3→AG4, fm SG3→AG4, fn SG3→AG4 → 7
 *   Se mantuvo: 7
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function sm3(
  value: number,
  band: 'critical' | 'high' | 'medium' | 'low',
  exploit_signal: number,
  criticality_multiplier: number,
  exposure_multiplier: number,
) {
  return {
    scoring_model: 3,
    value,
    alpha: 0.98,
    beta: 0.99,
    gamma: band === 'critical' || band === 'high' ? 1 : 0,
    vulnerability: value / (criticality_multiplier * exposure_multiplier) > 1
      ? 0.99
      : value / (criticality_multiplier * exposure_multiplier),
    criticality_multiplier,
    exposure_multiplier,
    lifecycle_multiplier: 1,
    exploit_signal,
    information_classification_multiplier: null,
    band,
    data_gaps: [],
  }
}

function minimalAsset(
  name: string,
  kind: 'server' | 'virtual_machine' | 'workstation' | 'network_device',
  criticality: 'high' | 'medium' | 'low',
  exposure: 'internet_facing' | 'internal' | 'unknown',
) {
  return {
    name,
    kind,
    criticality,
    exposure,
    lifecycle_stage: 'production' as const,
    information_classification: 'unclassified' as const,
    critical_services: [] as never[],
  }
}

function kev(date_added: string) {
  return {
    date_added,
    due_date: '',
    required_action: 'Apply updates per vendor instructions.',
    known_ransomware_campaign_use: 'Known' as const,
  }
}

function epss(probability: number) {
  return { probability, percentile: 0.999, score_date: '2026-11-05' }
}

function cvss31(base_score: number) {
  return [{ version: '3.1', base_score, vector: `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`, type: 'Primary' as const }]
}

const labeling = { outcome: 'not_tried' as const, model: '' }

// ─── findings ───────────────────────────────────────────────────────────────

const FINDINGS: Record<string, Finding> = {
  // ── f01: CVE-2025-1094 · pg-prod-01 · PostgreSQL 15.6 ──────────────────
  // SG3 (rank 14) → AG2  → subió
  f01: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e01',
    cve_id: 'CVE-2025-1094',
    asset_name: 'pg-prod-01',
    component: 'PostgreSQL',
    version: '15.6',
    score: 0.3079,
    score_rank: 14,
    group: 2,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: {
        criticality: 'high', exposure: 'internal',
        lifecycle_stage: 'production', information_classification: 'unclassified',
      },
      score_details: {
        scoring_model: 1, value: 0.3079,
        alpha: 0.81, beta: 0.9003, gamma: 0, vulnerability: 0.5131,
        criticality_multiplier: 1, exposure_multiplier: 0.6, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
    },
    details: {
      description:
        'Improper neutralization of quoting syntax in PostgreSQL libpq functions PQescapeLiteral(), PQescapeIdentifier(), PQescapeString(), and PQescapeStringConn() allows a database input provider to achieve SQL injection in certain usage patterns.  Specifically, SQL injection requires the application to use the function result to construct input to psql, the PostgreSQL interactive terminal.  Similarly, improper neutralization of quoting syntax in PostgreSQL command line utility programs allows a source of command line arguments to achieve SQL injection when client_encoding is BIG5 and server_encoding is one of EUC_TW or MULE_INTERNAL.  Versions before PostgreSQL 17.3, 16.7, 15.11, 14.16, and 13.19 are affected.',
      asset: {
        name: 'pg-prod-01', kind: 'server', criticality: 'high',
        exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified',
        critical_services: [{ name: 'Pagos en línea', description: 'Cobros con tarjeta de los comercios.', impact: 'critical', max_downtime: '1h_4h' }],
      },
      component_role: 'application',
      score_details: {
        scoring_model: 1, value: 0.3079,
        alpha: 0.81, beta: 0.9003, gamma: 0, vulnerability: 0.5131,
        criticality_multiplier: 1, exposure_multiplier: 0.6, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
      kev: null,
      epss: { probability: 0.9003, percentile: 0.99795, score_date: '2026-11-05' },
      cvss: [{ version: '3.1', base_score: 8.1, vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Secondary' }],
      references: [
        'https://www.postgresql.org/support/security/CVE-2025-1094/',
        'http://www.openwall.com/lists/oss-security/2025/02/16/3',
        'http://www.openwall.com/lists/oss-security/2025/02/20/1',
      ],
      unavailable_feeds: [], advisories: [],
      labeling: { outcome: 'labeled', model: 'claude-haiku-5-5' },
      techniques: [{
        attack_id: 'T1190', name: 'Exploit Public-Facing Application',
        tactics: ['initial-access'], role: 'exploitation',
        evidence: 'allows a database input provider to achieve SQL injection',
        rationale: 'Una inyección SQL en una función que reciben datos de fuera.',
        mitigations: [{ attack_id: 'M1051', name: 'Update Software', advice: 'Update software regularly by employing patch management for externally exposed applications.' }],
        labeled_as: '',
      }],
    },
  },

  // ── f02: CVE-2024-6387 · pg-prod-01 · Ubuntu 22.04 ────────────────────
  // SG3 (rank 13) → AG2  → subió   (placed_at after previous → "New")
  f02: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e02',
    cve_id: 'CVE-2024-6387',
    asset_name: 'pg-prod-01',
    component: 'Ubuntu Server',
    version: '22.04',
    score: 0.3249,
    score_rank: 13,
    group: 2,
    placed_at: '2026-11-11T08:00:00Z',
    closed_at: null,
    current: {
      asset: {
        criticality: 'high', exposure: 'internal',
        lifecycle_stage: 'production', information_classification: 'unclassified',
      },
      score_details: {
        scoring_model: 1, value: 0.3249,
        alpha: 0.81, beta: 0.9951, gamma: 0, vulnerability: 0.5415,
        criticality_multiplier: 1, exposure_multiplier: 0.6, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
    },
    details: {
      description: 'A security regression (CVE-2006-5051) was discovered in OpenSSH\'s server (sshd). There is a race condition which can lead sshd to handle some signals in an unsafe manner. An unauthenticated, remote attacker may be able to trigger it by failing to authenticate within a set time period.',
      asset: {
        name: 'pg-prod-01', kind: 'server', criticality: 'high',
        exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified',
        critical_services: [],
      },
      component_role: 'operating_system',
      score_details: {
        scoring_model: 1, value: 0.3249,
        alpha: 0.81, beta: 0.9951, gamma: 0, vulnerability: 0.5415,
        criticality_multiplier: 1, exposure_multiplier: 0.6, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
      kev: null, epss: { probability: 0.99506, percentile: 0.99945, score_date: '2026-11-05' },
      cvss: [
        { version: '3.1', base_score: 8.1, vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Secondary' },
        { version: '3.1', base_score: 8.1, vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Primary' },
      ],
      references: [
        'https://access.redhat.com/errata/RHSA-2024:4312',
        'https://access.redhat.com/errata/RHSA-2024:4340',
        'https://access.redhat.com/errata/RHSA-2024:4389',
      ],
      unavailable_feeds: [], advisories: [], labeling: { outcome: 'not_tried', model: '' }, techniques: [],
    },
  },

  // ── f03: CVE-2021-41773 · web-01 · Apache 2.4.49 ──────────────────────
  // SG1 (rank 1) → AG1  → se mantiene
  f03: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e03',
    cve_id: 'CVE-2021-41773',
    asset_name: 'web-01',
    component: 'Apache HTTP Server',
    version: '2.4.49',
    score: 0.98,
    score_rank: 1,
    group: 1,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: {
        criticality: 'medium', exposure: 'internet_facing',
        lifecycle_stage: 'production', information_classification: 'confidential',
      },
      score_details: {
        scoring_model: 3, value: 0.98,
        alpha: 0.98, beta: 0.9999, gamma: 1, vulnerability: 0.98,
        criticality_multiplier: 0.75, exposure_multiplier: 1, lifecycle_multiplier: 1,
        exploit_signal: 1, information_classification_multiplier: 1,
        band: 'critical', data_gaps: [],
      },
    },
    details: {
      description: 'A flaw was found in a change made to path normalization in Apache HTTP Server 2.4.49. An attacker could use a path traversal attack to map URLs to files outside the directories configured by Alias-like directives. If files outside of these directories are not protected by the usual default configuration "require all denied", these requests can succeed. If CGI scripts are also enabled for these aliased pathes, this could allow for remote code execution. This issue is known to be exploited in the wild. This issue only affects Apache 2.4.49 and not earlier versions. The fix in Apache HTTP Server 2.4.50 was found to be incomplete, see CVE-2021-42013.',
      asset: {
        name: 'web-01', kind: 'server', criticality: 'medium',
        exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'confidential',
        critical_services: [],
      },
      component_role: 'application',
      score_details: {
        scoring_model: 3, value: 0.98,
        alpha: 0.98, beta: 0.9999, gamma: 1, vulnerability: 0.98,
        criticality_multiplier: 0.75, exposure_multiplier: 1, lifecycle_multiplier: 1,
        exploit_signal: 1, information_classification_multiplier: 1,
        band: 'critical', data_gaps: [],
      },
      kev: { date_added: '2021-11-03', due_date: '2021-11-17', required_action: 'Apply updates per vendor instructions.', known_ransomware_campaign_use: 'Known' },
      epss: { probability: 0.99992, percentile: 0.99986, score_date: '2026-11-05' },
      cvss: [
        { version: '2.0', base_score: 4.3, vector: 'AV:N/AC:M/Au:N/C:P/I:N/A:N', type: 'Primary' },
        { version: '3.1', base_score: 9.8, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Primary' },
        { version: '3.1', base_score: 7.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', type: 'Secondary' },
      ],
      references: [
        'http://packetstormsecurity.com/files/164418/Apache-HTTP-Server-2.4.49-Path-Traversal-Remote-Code-Execution.html',
        'http://packetstormsecurity.com/files/164418/Apache-HTTP-Server-2.4.49-Path-Traversal.html',
        'http://packetstormsecurity.com/files/164629/Apache-2.4.49-2.4.50-Traversal-Remote-Code-Execution.html',
      ],
      unavailable_feeds: [], advisories: [], labeling: { outcome: 'not_tried', model: '' }, techniques: [],
    },
  },

  // ── f04: CVE-2021-42013 · web-01 · Apache 2.4.49 ──────────────────────
  // SG2 (rank 5) → AG1  → subió
  f04: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e04',
    cve_id: 'CVE-2021-42013',
    asset_name: 'web-01',
    component: 'Apache HTTP Server',
    version: '2.4.49',
    score: 0.6957,
    score_rank: 5,
    group: 1,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: {
        criticality: 'medium', exposure: 'internet_facing',
        lifecycle_stage: 'production', information_classification: 'confidential',
      },
      score_details: {
        scoring_model: 1, value: 0.6957,
        alpha: 0.98, beta: 0.9996, gamma: 1, vulnerability: 0.9939,
        criticality_multiplier: 0.7, exposure_multiplier: 1, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
    },
    details: {
      description: 'It was found that the fix for CVE-2021-41773 in Apache HTTP Server 2.4.50 was insufficient. An attacker could use a path traversal attack to map URLs to files outside the directories configured by Alias-like directives. If files outside of these directories are not protected by the usual default configuration "require all denied", these requests can succeed. If CGI scripts are also enabled for these aliased pathes, this could allow for remote code execution. This issue only affects Apache 2.4.49 and Apache 2.4.50 and not earlier versions.',
      asset: {
        name: 'web-01', kind: 'server', criticality: 'medium',
        exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'confidential',
        critical_services: [],
      },
      component_role: 'application',
      score_details: {
        scoring_model: 1, value: 0.6957,
        alpha: 0.98, beta: 0.9996, gamma: 1, vulnerability: 0.9939,
        criticality_multiplier: 0.7, exposure_multiplier: 1, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
      kev: { date_added: '2021-11-03', due_date: '2021-11-17', required_action: 'Apply updates per vendor instructions.', known_ransomware_campaign_use: 'Known' },
      epss: { probability: 0.99964, percentile: 0.99976, score_date: '2026-11-05' },
      cvss: [
        { version: '2.0', base_score: 7.5, vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P', type: 'Primary' },
        { version: '3.1', base_score: 9.8, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Primary' },
        { version: '3.1', base_score: 9.8, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Secondary' },
      ],
      references: [
        'http://jvn.jp/en/jp/JVN51106450/index.html',
        'http://packetstormsecurity.com/files/164501/Apache-HTTP-Server-2.4.50-Path-Traversal-Code-Execution.html',
        'http://packetstormsecurity.com/files/164609/Apache-HTTP-Server-2.4.50-Remote-Code-Execution.html',
      ],
      unavailable_feeds: [], advisories: [], labeling: { outcome: 'not_tried', model: '' }, techniques: [],
    },
  },

  // ── f05: CVE-2024-23897 · jenkins-prod · Jenkins 2.441 ─────────────────
  // SG4 (rank 17) → AG2  → subió
  f05: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e05',
    cve_id: 'CVE-2024-23897',
    asset_name: 'lab-01',
    component: 'Jenkins',
    version: '2.441',
    score: 0.2386,
    score_rank: 17,
    group: 2,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: {
        criticality: 'low', exposure: 'internal',
        lifecycle_stage: 'implementation', information_classification: 'unclassified',
      },
      score_details: {
        scoring_model: 2, value: 0.1909,
        alpha: 0.98, beta: 1, gamma: 1, vulnerability: 0.994,
        criticality_multiplier: 0.4, exposure_multiplier: 0.6, lifecycle_multiplier: 0.8,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
    },
    details: {
      description: 'Jenkins 2.441 and earlier, LTS 2.426.2 and earlier does not disable a feature of its CLI command parser that replaces an \'@\' character followed by a file path in an argument with the file\'s contents, allowing unauthenticated attackers to read arbitrary files on the Jenkins controller file system.',
      asset: {
        name: 'lab-01', kind: 'virtual_machine', criticality: 'low',
        exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified',
        critical_services: [],
      },
      component_role: 'application',
      score_details: {
        scoring_model: 1, value: 0.2386,
        alpha: 0.98, beta: 1, gamma: 1, vulnerability: 0.994,
        criticality_multiplier: 0.4, exposure_multiplier: 0.6, lifecycle_multiplier: 1,
        exploit_signal: null, information_classification_multiplier: null,
        band: null, data_gaps: [],
      },
      kev: { date_added: '2024-08-19', due_date: '2024-09-09', required_action: 'Apply mitigations per vendor instructions or discontinue use of the product if mitigations are unavailable.', known_ransomware_campaign_use: 'Known' },
      epss: { probability: 0.99999, percentile: 0.99995, score_date: '2026-11-05' },
      cvss: [
        { version: '3.1', base_score: 9.8, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Primary' },
        { version: '3.1', base_score: 9.8, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', type: 'Secondary' },
      ],
      references: [
        'http://packetstormsecurity.com/files/176839/Jenkins-2.441-LTS-2.426.3-CVE-2024-23897-Scanner.html',
        'http://packetstormsecurity.com/files/176840/Jenkins-2.441-LTS-2.426.3-Arbitrary-File-Read.html',
        'http://www.openwall.com/lists/oss-security/2024/01/24/6',
      ],
      unavailable_feeds: [], advisories: [], labeling: { outcome: 'not_tried', model: '' }, techniques: [],
    },
  },

  // ── fa: CVE-2017-5638 · store-01 · Apache Struts 2.3.5 ─────────────────
  // SG1 (rank 2) → AG1  → se mantiene
  fa: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e06',
    cve_id: 'CVE-2017-5638',
    asset_name: 'store-01',
    component: 'Apache Struts',
    version: '2.3.5',
    score: 0.93,
    score_rank: 2,
    group: 1,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'high', exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.93, 'critical', 1, 1, 1),
    },
    details: {
      description: 'The Jakarta Multipart parser in Apache Struts 2 2.3.x before 2.3.32 and 2.5.x before 2.5.10.1 mishandles file upload, which allows remote attackers to execute arbitrary commands via a crafted Content-Type header, as exploited in the wild in March 2017.',
      asset: minimalAsset('store-01', 'server', 'high', 'internet_facing'),
      component_role: 'application',
      score_details: sm3(0.93, 'critical', 1, 1, 1),
      kev: kev('2022-03-25'), epss: epss(0.97521), cvss: cvss31(10.0),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2017-5638'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fb: CVE-2022-26134 · wiki-01 · Confluence 7.13.0 ──────────────────
  // SG1 (rank 3) → AG2  → bajó  ("versión 7.13.0 no es la afectada (8.x+)")
  fb: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e08',
    cve_id: 'CVE-2022-26134',
    asset_name: 'wiki-01',
    component: 'Confluence',
    version: '7.13.0',
    score: 0.89,
    score_rank: 3,
    group: 2,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'high', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.89, 'high', 1, 1, 0.9),
    },
    details: {
      description: 'In affected versions of Confluence Server and Data Center, an OGNL injection vulnerability exists that would allow an unauthenticated attacker to execute arbitrary code on a Confluence Server or Data Center instance. This CVE affects Confluence Server and Data Center 1.3.0 through 7.4.17, 7.13.x through 7.13.7, 7.14.x through 7.14.3, and similar ranges.',
      asset: minimalAsset('wiki-01', 'server', 'high', 'internal'),
      component_role: 'application',
      score_details: sm3(0.89, 'high', 1, 1, 0.9),
      kev: kev('2022-06-02'), epss: epss(0.97112), cvss: cvss31(9.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-26134'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fe: CVE-2023-44487 · pay-gw-01 · nginx 1.24.0 ─────────────────────
  // SG1 (rank 4) → AG1  → se mantiene
  fe: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e07',
    cve_id: 'CVE-2023-44487',
    asset_name: 'pay-gw-01',
    component: 'nginx',
    version: '1.24.0',
    score: 0.71,
    score_rank: 4,
    group: 1,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'high', exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.71, 'high', 0.8, 1, 1),
    },
    details: {
      description: 'The HTTP/2 protocol allows a denial of service (server resource consumption) because request cancellation can reset many streams quickly, as exploited in the wild in August through October 2023.',
      asset: minimalAsset('pay-gw-01', 'server', 'high', 'internet_facing'),
      component_role: 'application',
      score_details: sm3(0.71, 'high', 0.8, 1, 1),
      kev: kev('2023-10-10'), epss: epss(0.90123), cvss: cvss31(7.5),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2023-44487'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fc: CVE-2021-26855 · mail-01 · Exchange Server 2016 ───────────────
  // SG2 (rank 6) → AG2  → se mantiene
  fc: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e09',
    cve_id: 'CVE-2021-26855',
    asset_name: 'mail-01',
    component: 'Exchange Server',
    version: '2016',
    score: 0.56,
    score_rank: 6,
    group: 2,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'high', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.56, 'high', 1, 0.75, 0.6),
    },
    details: {
      description: 'Microsoft Exchange Server Remote Code Execution Vulnerability (ProxyLogon). An attacker could exploit this vulnerability to execute arbitrary code as SYSTEM.',
      asset: minimalAsset('mail-01', 'server', 'high', 'internal'),
      component_role: 'application',
      score_details: sm3(0.56, 'high', 1, 0.75, 0.6),
      kev: kev('2021-03-03'), epss: epss(0.97643), cvss: cvss31(9.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-26855'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fd: CVE-2023-23397 · ws-prod-01 · Outlook 2016 ────────────────────
  // SG2 (rank 7) → AG3  → bajó
  fd: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e10',
    cve_id: 'CVE-2023-23397',
    asset_name: 'ws-prod-01',
    component: 'Microsoft Outlook',
    version: '2016',
    score: 0.46,
    score_rank: 7,
    group: 3,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'medium', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.46, 'medium', 0.3, 0.75, 0.6),
    },
    details: {
      description: 'Microsoft Outlook Elevation of Privilege Vulnerability. An attacker could exploit this vulnerability by sending a specially crafted email to trigger a Net-NTLMv2 hash leak.',
      asset: minimalAsset('ws-prod-01', 'workstation', 'medium', 'internal'),
      component_role: 'application',
      score_details: sm3(0.46, 'medium', 0.3, 0.75, 0.6),
      kev: null, epss: epss(0.86234), cvss: cvss31(9.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2023-23397'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fg: CVE-2021-34527 · print-srv · Windows Print Spooler ─────────────
  // SG2 (rank 8) → AG3  → bajó
  fg: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e11',
    cve_id: 'CVE-2021-34527',
    asset_name: 'print-srv',
    component: 'Windows Print Spooler',
    version: '10.0.19041',
    score: 0.43,
    score_rank: 8,
    group: 3,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'medium', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.43, 'medium', 0.3, 0.75, 0.6),
    },
    details: {
      description: 'Windows Print Spooler Remote Code Execution Vulnerability (PrintNightmare). A remote code execution vulnerability exists when the Windows Print Spooler service improperly performs privileged file operations.',
      asset: minimalAsset('print-srv', 'server', 'medium', 'internal'),
      component_role: 'application',
      score_details: sm3(0.43, 'medium', 0.3, 0.75, 0.6),
      kev: null, epss: epss(0.95231), cvss: cvss31(8.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-34527'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fh: CVE-2022-30190 · dev-ws-01 · Windows MSDT ─────────────────────
  // SG2 (rank 9) → AG3  → bajó
  fh: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e12',
    cve_id: 'CVE-2022-30190',
    asset_name: 'dev-ws-01',
    component: 'Windows MSDT',
    version: '10.0.22000',
    score: 0.41,
    score_rank: 9,
    group: 3,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'medium', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.41, 'medium', 0.3, 0.75, 0.6),
    },
    details: {
      description: 'A remote code execution vulnerability exists when MSDT is called using the URL protocol from a calling application. An attacker who successfully exploits this vulnerability can run arbitrary code with the privileges of the calling application (Follina).',
      asset: minimalAsset('dev-ws-01', 'workstation', 'medium', 'internal'),
      component_role: 'application',
      score_details: sm3(0.41, 'medium', 0.3, 0.75, 0.6),
      kev: null, epss: epss(0.97012), cvss: cvss31(7.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-30190'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fi: CVE-2020-1472 · dc-backup · Netlogon ──────────────────────────
  // SG3 (rank 10) → AG3  → se mantiene
  fi: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e13',
    cve_id: 'CVE-2020-1472',
    asset_name: 'dc-backup',
    component: 'Netlogon',
    version: 'Windows Server 2019',
    score: 0.38,
    score_rank: 10,
    group: 3,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'medium', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.38, 'medium', 0.3, 0.75, 0.6),
    },
    details: {
      description: 'An elevation of privilege vulnerability exists when an attacker establishes a vulnerable Netlogon secure channel connection to a domain controller (Zerologon). An attacker who successfully exploited this vulnerability could run a specially crafted application on a device on the network.',
      asset: minimalAsset('dc-backup', 'server', 'medium', 'internal'),
      component_role: 'application',
      score_details: sm3(0.38, 'medium', 0.3, 0.75, 0.6),
      kev: kev('2020-09-23'), epss: epss(0.97456), cvss: cvss31(10.0),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2020-1472'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fj: CVE-2022-1388 · lb-01 · F5 BIG-IP 16.1.0 ─────────────────────
  // SG3 (rank 11) → AG4  → bajó  (parche ya aplicado)
  fj: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e14',
    cve_id: 'CVE-2022-1388',
    asset_name: 'lb-01',
    component: 'F5 BIG-IP',
    version: '16.1.0',
    score: 0.37,
    score_rank: 11,
    group: 4,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'medium', exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.37, 'medium', 0.2, 0.75, 1),
    },
    details: {
      description: 'On F5 BIG-IP 16.1.x versions prior to 16.1.2.2, 15.1.x versions prior to 15.1.5.1, and similar, undisclosed requests may bypass iControl REST authentication. NOTE: team confirmed version 16.1.0 is not in the vulnerable range.',
      asset: minimalAsset('lb-01', 'network_device', 'medium', 'internet_facing'),
      component_role: 'application',
      score_details: sm3(0.37, 'medium', 0.2, 0.75, 1),
      kev: kev('2022-05-09'), epss: epss(0.97320), cvss: cvss31(9.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-1388'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fm: CVE-2021-44228 · app-legacy · Apache Log4j 2.14.0 ─────────────
  // SG3 (rank 12) → AG4  → bajó  (versión en contenedor ya parchada)
  fm: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e15',
    cve_id: 'CVE-2021-44228',
    asset_name: 'app-legacy',
    component: 'Apache Log4j',
    version: '2.14.0',
    score: 0.35,
    score_rank: 12,
    group: 4,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'low', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.35, 'low', 0, 0.4, 0.6),
    },
    details: {
      description: 'Apache Log4j2 2.0-beta9 through 2.15.0 JNDI lookup feature allows attackers to control log messages to execute arbitrary code. The containerized deployment of this asset uses a patched image (Log4j 2.17.1) confirmed by the platform team on 2026-11-09.',
      asset: minimalAsset('app-legacy', 'server', 'low', 'internal'),
      component_role: 'application',
      score_details: sm3(0.35, 'low', 0, 0.4, 0.6),
      kev: kev('2021-12-10'), epss: epss(0.99998), cvss: cvss31(10.0),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-44228'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fn: CVE-2023-20198 · sw-core-01 · Cisco IOS XE 17.9 ───────────────
  // SG3 (rank 15) → AG4  → bajó
  fn: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e16',
    cve_id: 'CVE-2023-20198',
    asset_name: 'sw-core-01',
    component: 'Cisco IOS XE',
    version: '17.9.4',
    score: 0.31,
    score_rank: 15,
    group: 4,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'low', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.31, 'low', 0, 0.4, 0.6),
    },
    details: {
      description: 'Cisco IOS XE Web UI privilege escalation vulnerability. An unauthenticated, remote attacker can create an account with privilege level 15 access on an affected device. The web UI feature is disabled on this device.',
      asset: minimalAsset('sw-core-01', 'network_device', 'low', 'internal'),
      component_role: 'application',
      score_details: sm3(0.31, 'low', 0, 0.4, 0.6),
      kev: kev('2023-10-16'), epss: epss(0.97845), cvss: cvss31(10.0),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2023-20198'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fo: CVE-2022-0847 · build-srv · Linux kernel 5.8 ──────────────────
  // SG4 (rank 16) → AG4  → se mantiene
  fo: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e17',
    cve_id: 'CVE-2022-0847',
    asset_name: 'build-srv',
    component: 'Linux kernel',
    version: '5.8.0',
    score: 0.29,
    score_rank: 16,
    group: 4,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'low', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.29, 'low', 0, 0.4, 0.6),
    },
    details: {
      description: 'A flaw was found in the way the "flags" member of the new pipe buffer structure was lacking proper initialization in copy_page_to_iter_pipe and push_pipe functions in the Linux kernel (Dirty Pipe). The kernel has been updated to 5.17.6 on this host.',
      asset: minimalAsset('build-srv', 'server', 'low', 'internal'),
      component_role: 'operating_system',
      score_details: sm3(0.29, 'low', 0, 0.4, 0.6),
      kev: null, epss: epss(0.00321), cvss: cvss31(7.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2022-0847'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fp: CVE-2021-3156 · monitor-01 · sudo 1.9.5p2 ─────────────────────
  // SG4 (rank 18) → AG4  → se mantiene
  fp: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e18',
    cve_id: 'CVE-2021-3156',
    asset_name: 'monitor-01',
    component: 'sudo',
    version: '1.9.5p2',
    score: 0.27,
    score_rank: 18,
    group: 4,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'low', exposure: 'internal', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.27, 'low', 0, 0.4, 0.6),
    },
    details: {
      description: 'Sudo before 1.9.5p2 contains an off-by-one error that can result in a heap-based buffer overflow (Baron Samedit). This is exploitable by any local user. The asset runs no critical services.',
      asset: minimalAsset('monitor-01', 'server', 'low', 'internal'),
      component_role: 'application',
      score_details: sm3(0.27, 'low', 0, 0.4, 0.6),
      kev: null, epss: epss(0.00456), cvss: cvss31(7.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-3156'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fk: CVE-2024-21762 · fw-02 · FortiOS 7.2.4 ────────────────────────
  // SG4 (rank 19) → AG3  → subió  (interfaz admin expuesta en internet)
  fk: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e19',
    cve_id: 'CVE-2024-21762',
    asset_name: 'fw-02',
    component: 'FortiOS',
    version: '7.2.4',
    score: 0.26,
    score_rank: 19,
    group: 3,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'medium', exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.26, 'high', 0.6, 0.75, 1),
    },
    details: {
      description: 'An out-of-bounds write vulnerability in FortiOS may allow a remote unauthenticated attacker to execute arbitrary code or command via specially crafted HTTP requests. The admin interface of fw-02 is reachable from the internet without IP restrictions.',
      asset: minimalAsset('fw-02', 'network_device', 'medium', 'internet_facing'),
      component_role: 'application',
      score_details: sm3(0.26, 'high', 0.6, 0.75, 1),
      kev: kev('2024-02-09'), epss: epss(0.93421), cvss: cvss31(9.8),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-21762'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },

  // ── fl: CVE-2024-3400 · fw-01 · PAN-OS 11.0.1 ─────────────────────────
  // SG4 (rank 20) → AG3  → subió  (cortafuegos perimetral crítico)
  fl: {
    finding_id: '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e20',
    cve_id: 'CVE-2024-3400',
    asset_name: 'fw-01',
    component: 'PAN-OS',
    version: '11.0.1',
    score: 0.24,
    score_rank: 20,
    group: 3,
    placed_at: '2026-11-10T08:00:00Z',
    closed_at: null,
    current: {
      asset: { criticality: 'high', exposure: 'internet_facing', lifecycle_stage: 'production', information_classification: 'unclassified' },
      score_details: sm3(0.24, 'high', 0.6, 1, 1),
    },
    details: {
      description: 'A command injection vulnerability in the GlobalProtect feature of Palo Alto Networks PAN-OS software allows an unauthenticated attacker to execute arbitrary code with root privileges on the firewall. fw-01 is the primary perimeter firewall; it carries all inbound and outbound production traffic.',
      asset: minimalAsset('fw-01', 'network_device', 'high', 'internet_facing'),
      component_role: 'application',
      score_details: sm3(0.24, 'high', 0.6, 1, 1),
      kev: kev('2024-04-12'), epss: epss(0.97012), cvss: cvss31(10.0),
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-3400'],
      unavailable_feeds: [], advisories: [], labeling, techniques: [],
    },
  },
}

// ─── groups ─────────────────────────────────────────────────────────────────

const NO_GAPS = ' Ninguno de sus Scores tiene datos faltantes.'

const GROUPS: PriorityGroup[] = [
  {
    position: 1,
    title: 'Fallos con exploit activo sobre servicios expuestos a internet',
    reason:
      'CVE-2021-41773 y CVE-2021-42013 están en KEV sobre Apache 2.4.49 en web-01, expuesto a internet, con uso confirmado por ransomware; una sola actualización de Apache los corrige juntos.' +
      ' CVE-2017-5638 (Apache Struts) en store-01 también está en KEV con explotación masiva documentada.' +
      ' CVE-2023-44487 sobre pay-gw-01 sube desde el score 4 porque el margen de parchado de la pasarela de pago vence el viernes y no hay compensación activada.' +
      NO_GAPS,
    finding_ids: [
      FINDINGS.f03.finding_id,
      FINDINGS.f04.finding_id,
      FINDINGS.fa.finding_id,
      FINDINGS.fe.finding_id,
    ],
    evidence: [
      { finding_id: FINDINGS.f03.finding_id, path: '/kev/known_ransomware_campaign_use', value: 'Known' },
      { finding_id: FINDINGS.fa.finding_id, path: '/kev/known_ransomware_campaign_use', value: 'Known' },
      { finding_id: FINDINGS.fe.finding_id, path: '/asset/exposure', value: 'internet_facing' },
    ],
    context_evidence: [],
  },
  {
    position: 2,
    title: 'Explotados activamente, activos internos con servicios de pago y CI/CD',
    reason:
      'CVE-2025-1094 tiene EPSS 0.9003 sobre PostgreSQL 15.6 en pg-prod-01, de criticidad high, que corre Pagos en línea; no está en KEV y el activo es interno.' +
      NO_GAPS +
      '\n\nCVE-2024-6387 tiene EPSS 0.99506 sobre Ubuntu Server 22.04 en el mismo activo.' +
      NO_GAPS +
      '\n\nCVE-2024-23897 está en KEV con uso por ransomware sobre Jenkins 2.441 en lab-01 (CI/CD de producción). CVE-2021-26855 (ProxyLogon) está en KEV sobre Exchange Server 2016 en mail-01.' +
      ' CVE-2022-26134 baja desde el score 3 porque la versión instalada (7.13.0) es anterior a la afectada (8.x+), confirmado por auditoría del equipo.' +
      NO_GAPS,
    finding_ids: [
      FINDINGS.fb.finding_id,
      FINDINGS.f01.finding_id,
      FINDINGS.f02.finding_id,
      FINDINGS.f05.finding_id,
      FINDINGS.fc.finding_id,
    ],
    evidence: [
      { finding_id: FINDINGS.f01.finding_id, path: '/epss/probability', value: '0.9003' },
      { finding_id: FINDINGS.f01.finding_id, path: '/asset/critical_services/0/name', value: 'Pagos en línea' },
      { finding_id: FINDINGS.f02.finding_id, path: '/epss/probability', value: '0.99506' },
      { finding_id: FINDINGS.f05.finding_id, path: '/kev/date_added', value: '2024-08-19' },
      { finding_id: FINDINGS.f05.finding_id, path: '/asset/criticality', value: 'low' },
    ],
    context_evidence: [],
  },
  {
    position: 3,
    title: 'Alta probabilidad de explotación en activos de soporte y cortafuegos perimetrales',
    reason:
      'CVE-2023-23397, CVE-2021-34527 y CVE-2022-30190 bajan un grupo porque son vulnerabilidades de alta probabilidad sobre activos de soporte interno de criticidad media sin servicios críticos directos.' +
      ' CVE-2020-1472 (Zerologon) queda aquí por su potencial de impacto en el DC de respaldo.' +
      ' CVE-2024-21762 y CVE-2024-3400 suben desde el grupo 4 porque sus interfaces de administración están expuestas en internet y no hay compensaciones activas.' +
      NO_GAPS,
    finding_ids: [
      FINDINGS.fd.finding_id,
      FINDINGS.fg.finding_id,
      FINDINGS.fh.finding_id,
      FINDINGS.fi.finding_id,
      FINDINGS.fk.finding_id,
      FINDINGS.fl.finding_id,
    ],
    evidence: [
      { finding_id: FINDINGS.fk.finding_id, path: '/asset/exposure', value: 'internet_facing' },
      { finding_id: FINDINGS.fl.finding_id, path: '/asset/exposure', value: 'internet_facing' },
      { finding_id: FINDINGS.fi.finding_id, path: '/kev/date_added', value: '2020-09-23' },
    ],
    context_evidence: [],
  },
  {
    position: 4,
    title: 'Score alto pero sin riesgo inmediato confirmado',
    reason:
      'CVE-2022-1388 baja porque el equipo de red confirmó que la versión instalada de BIG-IP (16.1.0) no está en el rango afectado.' +
      ' CVE-2021-44228 baja porque la imagen del contenedor ya incluye Log4j 2.17.1 (confirmado el 2026-11-09).' +
      ' CVE-2023-20198 baja porque la función web UI está desactivada en sw-core-01.' +
      ' Los restantes están sobre activos de baja criticidad sin servicios críticos expuestos.' +
      NO_GAPS,
    finding_ids: [
      FINDINGS.fj.finding_id,
      FINDINGS.fm.finding_id,
      FINDINGS.fn.finding_id,
      FINDINGS.fo.finding_id,
      FINDINGS.fp.finding_id,
    ],
    evidence: [
      { finding_id: FINDINGS.fj.finding_id, path: '/kev/date_added', value: '2022-05-09' },
      { finding_id: FINDINGS.fm.finding_id, path: '/kev/date_added', value: '2021-12-10' },
    ],
    context_evidence: [],
  },
]

// ─── jenkins plan (preserved for detail-view tests) ─────────────────────────

const JENKINS_PLAN: ActionPlan = {
  finding_id: FINDINGS.f05.finding_id,
  created_at: '2026-11-10T15:20:00Z',
  model: 'claude-haiku-5-5',
  prompt_id: 'a1b2c3d4e5f6',
  output: {
    summary: 'Jenkins 2.441 en lab-01 permite leer archivos del controlador a través de su CLI, y KEV dice que ransomware la usa.',
    steps: [
      'Confirma la versión de Jenkins instalada en lab-01.',
      'Actualiza Jenkins a 2.442.',
      'Mientras tanto, desactiva el acceso a la CLI de Jenkins.',
    ],
    fixed_version: '2.442',
    mitigation: 'Apply mitigations per vendor instructions or discontinue use of the product if mitigations are unavailable.',
    verification: 'Revisa en la página "Manage Jenkins" que la versión sea 2.442.',
    sources: FINDINGS.f05.details.references.slice(0, 1),
    attack_mitigations: [],
  },
}

// ─── mock prioritizations ────────────────────────────────────────────────────

const FIRST_ID = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01'

const ALL_FINDINGS = Object.values(FINDINGS)

// Previous prioritization: same 4 groups but G2 is missing f02 (CVE-2024-6387,
// placed after this prioritization was created). 19 findings total.
const PREVIOUS_GROUPS: PriorityGroup[] = GROUPS.map((g) =>
  g.position === 2
    ? {
        ...g,
        finding_ids: g.finding_ids.filter((id) => id !== FINDINGS.f02.finding_id),
        reason: g.reason.split('\n\n')[0] + NO_GAPS,
      }
    : g,
)

const MOCK_PRIORITIZATIONS: Prioritization[] = [
  {
    id: '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02',
    previous_id: FIRST_ID,
    business_context_version: 1,
    created_at: '2026-11-11T09:00:00Z',
    model: 'claude-haiku-5-5',
    prompt_id: '10446cd88908',
    groups: GROUPS,
    findings: ALL_FINDINGS,
    plans: [JENKINS_PLAN],
    feedback: [],
  },
  {
    id: FIRST_ID,
    previous_id: null,
    business_context_version: 1,
    created_at: '2026-11-10T09:00:00Z',
    model: 'claude-haiku-5-5',
    prompt_id: '10446cd88908',
    groups: PREVIOUS_GROUPS,
    findings: ALL_FINDINGS.filter((f) => f.finding_id !== FINDINGS.f02.finding_id),
    plans: [JENKINS_PLAN],
    feedback: [],
  },
]

/** Newest first, as GET /prioritizations lists them. */
export const prioritizationsStore = localStore(
  'barbattack_mock_prioritizations',
  z.array(prioritizationSchema),
  MOCK_PRIORITIZATIONS,
)
