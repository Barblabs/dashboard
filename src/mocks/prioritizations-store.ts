import type { ActionPlan, Finding, Prioritization, PriorityGroup } from '../api/prioritizations'
import { localStore } from './localStore'

/*
 * Findings of the backend's docs/examples/findings.json, as GET /prioritizations/{id}
 * answers them. The newest Prioritization kept the order of the one before it and placed
 * CVE-2024-6387 in the third group.
 */
const FINDINGS: Record<'f1' | 'f2' | 'f3' | 'f4' | 'f5', Finding> = {
  f1: {
    "finding_id": "6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e01",
    "cve_id": "CVE-2025-1094",
    "asset_name": "pg-prod-01",
    "component": "PostgreSQL",
    "version": "15.6",
    "score": 0.3079,
    "score_rank": 4,
    "group": 3,
    "placed_at": "2026-11-10T08:58:00Z",
    "closed_at": null,
    "details": {
      "description": "Improper neutralization of quoting syntax in PostgreSQL libpq functions PQescapeLiteral(), PQescapeIdentifier(), PQescapeString(), and PQescapeStringConn() allows a database input provider to achieve SQL injection in certain usage patterns.  Specifically, SQL injection requires the application to use the function result to construct input to psql, the PostgreSQL interactive terminal.  Similarly, improper neutralization of quoting syntax in PostgreSQL command line utility programs allows a source of command line arguments to achieve SQL injection when client_encoding is BIG5 and server_encoding is one of EUC_TW or MULE_INTERNAL.  Versions before PostgreSQL 17.3, 16.7, 15.11, 14.16, and 13.19 are affected.",
      "asset": {
        "name": "pg-prod-01",
        "kind": "server",
        "criticality": "high",
        "exposure": "internal",
        "lifecycle_stage": "production",
        "critical_services": [
          {
            "name": "Pagos en línea",
            "description": "Cobros con tarjeta de los comercios.",
            "impact": "critical",
            "max_downtime": "1h_4h"
          }
        ]
      },
      "component_role": "application",
      "score_details": {
        "scoring_model": 1,
        "value": 0.3079,
        "alpha": 0.81,
        "beta": 0.9003,
        "gamma": 0,
        "vulnerability": 0.5131,
        "criticality_multiplier": 1,
        "exposure_multiplier": 0.6,
        "lifecycle_multiplier": 1,
        "data_gaps": []
      },
      "kev": null,
      "epss": {
        "probability": 0.9003,
        "percentile": 0.99795,
        "score_date": "2026-11-05"
      },
      "cvss": [
        {
          "version": "3.1",
          "base_score": 8.1,
          "vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Secondary"
        }
      ],
      "references": [
        "https://www.postgresql.org/support/security/CVE-2025-1094/",
        "http://www.openwall.com/lists/oss-security/2025/02/16/3",
        "http://www.openwall.com/lists/oss-security/2025/02/20/1"
      ],
      "unavailable_feeds": [],
      "advisories": [],
      "labeling": {
        "outcome": "labeled",
        "model": "claude-haiku-5-5"
      },
      "techniques": [
        {
          "attack_id": "T1190",
          "name": "Exploit Public-Facing Application",
          "tactics": [
            "initial-access"
          ],
          "role": "exploitation",
          "evidence": "allows a database input provider to achieve SQL injection",
          "rationale": "Una inyección SQL en una función que reciben datos de fuera.",
          "mitigations": [
            {
              "attack_id": "M1051",
              "name": "Update Software",
              "advice": "Update software regularly by employing patch management for externally exposed applications."
            }
          ],
          "labeled_as": ""
        }
      ]
    }
  },
  f2: {
    "finding_id": "6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e02",
    "cve_id": "CVE-2024-6387",
    "asset_name": "pg-prod-01",
    "component": "Ubuntu Server",
    "version": "22.04",
    "score": 0.3249,
    "score_rank": 3,
    "group": 3,
    "placed_at": "2026-11-11T08:58:00Z",
    "closed_at": null,
    "details": {
      "description": "A security regression (CVE-2006-5051) was discovered in OpenSSH's server (sshd). There is a race condition which can lead sshd to handle some signals in an unsafe manner. An unauthenticated, remote attacker may be able to trigger it by failing to authenticate within a set time period.",
      "asset": {
        "name": "pg-prod-01",
        "kind": "server",
        "criticality": "high",
        "exposure": "internal",
        "lifecycle_stage": "production",
        "critical_services": []
      },
      "component_role": "operating_system",
      "score_details": {
        "scoring_model": 1,
        "value": 0.3249,
        "alpha": 0.81,
        "beta": 0.9951,
        "gamma": 0,
        "vulnerability": 0.5415,
        "criticality_multiplier": 1,
        "exposure_multiplier": 0.6,
        "lifecycle_multiplier": 1,
        "data_gaps": []
      },
      "kev": null,
      "epss": {
        "probability": 0.99506,
        "percentile": 0.99945,
        "score_date": "2026-11-05"
      },
      "cvss": [
        {
          "version": "3.1",
          "base_score": 8.1,
          "vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Secondary"
        },
        {
          "version": "3.1",
          "base_score": 8.1,
          "vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Primary"
        }
      ],
      "references": [
        "https://access.redhat.com/errata/RHSA-2024:4312",
        "https://access.redhat.com/errata/RHSA-2024:4340",
        "https://access.redhat.com/errata/RHSA-2024:4389"
      ],
      "unavailable_feeds": [],
      "advisories": [],
      "labeling": {
        "outcome": "not_tried",
        "model": ""
      },
      "techniques": []
    }
  },
  f3: {
    "finding_id": "6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e03",
    "cve_id": "CVE-2021-41773",
    "asset_name": "web-01",
    "component": "Apache HTTP Server",
    "version": "2.4.49",
    "score": 0.6958,
    "score_rank": 1,
    "group": 1,
    "placed_at": "2026-11-10T08:58:00Z",
    "closed_at": null,
    "details": {
      "description": "A flaw was found in a change made to path normalization in Apache HTTP Server 2.4.49. An attacker could use a path traversal attack to map URLs to files outside the directories configured by Alias-like directives. If files outside of these directories are not protected by the usual default configuration \"require all denied\", these requests can succeed. If CGI scripts are also enabled for these aliased pathes, this could allow for remote code execution. This issue is known to be exploited in the wild. This issue only affects Apache 2.4.49 and not earlier versions. The fix in Apache HTTP Server 2.4.50 was found to be incomplete, see CVE-2021-42013.",
      "asset": {
        "name": "web-01",
        "kind": "server",
        "criticality": "medium",
        "exposure": "internet_facing",
        "lifecycle_stage": "production",
        "critical_services": []
      },
      "component_role": "application",
      "score_details": {
        "scoring_model": 1,
        "value": 0.6958,
        "alpha": 0.98,
        "beta": 0.9999,
        "gamma": 1,
        "vulnerability": 0.994,
        "criticality_multiplier": 0.7,
        "exposure_multiplier": 1,
        "lifecycle_multiplier": 1,
        "data_gaps": []
      },
      "kev": {
        "date_added": "2021-11-03",
        "due_date": "2021-11-17",
        "required_action": "Apply updates per vendor instructions.",
        "known_ransomware_campaign_use": "Known"
      },
      "epss": {
        "probability": 0.99992,
        "percentile": 0.99986,
        "score_date": "2026-11-05"
      },
      "cvss": [
        {
          "version": "2.0",
          "base_score": 4.3,
          "vector": "AV:N/AC:M/Au:N/C:P/I:N/A:N",
          "type": "Primary"
        },
        {
          "version": "3.1",
          "base_score": 9.8,
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Primary"
        },
        {
          "version": "3.1",
          "base_score": 7.5,
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
          "type": "Secondary"
        }
      ],
      "references": [
        "http://packetstormsecurity.com/files/164418/Apache-HTTP-Server-2.4.49-Path-Traversal-Remote-Code-Execution.html",
        "http://packetstormsecurity.com/files/164418/Apache-HTTP-Server-2.4.49-Path-Traversal.html",
        "http://packetstormsecurity.com/files/164629/Apache-2.4.49-2.4.50-Traversal-Remote-Code-Execution.html"
      ],
      "unavailable_feeds": [],
      "advisories": [],
      "labeling": {
        "outcome": "not_tried",
        "model": ""
      },
      "techniques": []
    }
  },
  f4: {
    "finding_id": "6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e04",
    "cve_id": "CVE-2021-42013",
    "asset_name": "web-01",
    "component": "Apache HTTP Server",
    "version": "2.4.49",
    "score": 0.6957,
    "score_rank": 2,
    "group": 1,
    "placed_at": "2026-11-10T08:58:00Z",
    "closed_at": null,
    "details": {
      "description": "It was found that the fix for CVE-2021-41773 in Apache HTTP Server 2.4.50 was insufficient. An attacker could use a path traversal attack to map URLs to files outside the directories configured by Alias-like directives. If files outside of these directories are not protected by the usual default configuration \"require all denied\", these requests can succeed. If CGI scripts are also enabled for these aliased pathes, this could allow for remote code execution. This issue only affects Apache 2.4.49 and Apache 2.4.50 and not earlier versions.",
      "asset": {
        "name": "web-01",
        "kind": "server",
        "criticality": "medium",
        "exposure": "internet_facing",
        "lifecycle_stage": "production",
        "critical_services": []
      },
      "component_role": "application",
      "score_details": {
        "scoring_model": 1,
        "value": 0.6957,
        "alpha": 0.98,
        "beta": 0.9996,
        "gamma": 1,
        "vulnerability": 0.9939,
        "criticality_multiplier": 0.7,
        "exposure_multiplier": 1,
        "lifecycle_multiplier": 1,
        "data_gaps": []
      },
      "kev": {
        "date_added": "2021-11-03",
        "due_date": "2021-11-17",
        "required_action": "Apply updates per vendor instructions.",
        "known_ransomware_campaign_use": "Known"
      },
      "epss": {
        "probability": 0.99964,
        "percentile": 0.99976,
        "score_date": "2026-11-05"
      },
      "cvss": [
        {
          "version": "2.0",
          "base_score": 7.5,
          "vector": "AV:N/AC:L/Au:N/C:P/I:P/A:P",
          "type": "Primary"
        },
        {
          "version": "3.1",
          "base_score": 9.8,
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Primary"
        },
        {
          "version": "3.1",
          "base_score": 9.8,
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Secondary"
        }
      ],
      "references": [
        "http://jvn.jp/en/jp/JVN51106450/index.html",
        "http://packetstormsecurity.com/files/164501/Apache-HTTP-Server-2.4.50-Path-Traversal-Code-Execution.html",
        "http://packetstormsecurity.com/files/164609/Apache-HTTP-Server-2.4.50-Remote-Code-Execution.html"
      ],
      "unavailable_feeds": [],
      "advisories": [],
      "labeling": {
        "outcome": "not_tried",
        "model": ""
      },
      "techniques": []
    }
  },
  f5: {
    "finding_id": "6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e05",
    "cve_id": "CVE-2024-23897",
    "asset_name": "lab-01",
    "component": "Jenkins",
    "version": "2.441",
    "score": 0.2386,
    "score_rank": 5,
    "group": 2,
    "placed_at": "2026-11-10T08:58:00Z",
    "closed_at": null,
    "details": {
      "description": "Jenkins 2.441 and earlier, LTS 2.426.2 and earlier does not disable a feature of its CLI command parser that replaces an '@' character followed by a file path in an argument with the file's contents, allowing unauthenticated attackers to read arbitrary files on the Jenkins controller file system.",
      "asset": {
        "name": "lab-01",
        "kind": "virtual_machine",
        "criticality": "low",
        "exposure": "internal",
        "lifecycle_stage": "production",
        "critical_services": []
      },
      "component_role": "application",
      "score_details": {
        "scoring_model": 1,
        "value": 0.2386,
        "alpha": 0.98,
        "beta": 1,
        "gamma": 1,
        "vulnerability": 0.994,
        "criticality_multiplier": 0.4,
        "exposure_multiplier": 0.6,
        "lifecycle_multiplier": 1,
        "data_gaps": []
      },
      "kev": {
        "date_added": "2024-08-19",
        "due_date": "2024-09-09",
        "required_action": "Apply mitigations per vendor instructions or discontinue use of the product if mitigations are unavailable.",
        "known_ransomware_campaign_use": "Known"
      },
      "epss": {
        "probability": 0.99999,
        "percentile": 0.99995,
        "score_date": "2026-11-05"
      },
      "cvss": [
        {
          "version": "3.1",
          "base_score": 9.8,
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Primary"
        },
        {
          "version": "3.1",
          "base_score": 9.8,
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "type": "Secondary"
        }
      ],
      "references": [
        "http://packetstormsecurity.com/files/176839/Jenkins-2.441-LTS-2.426.3-CVE-2024-23897-Scanner.html",
        "http://packetstormsecurity.com/files/176840/Jenkins-2.441-LTS-2.426.3-Arbitrary-File-Read.html",
        "http://www.openwall.com/lists/oss-security/2024/01/24/6"
      ],
      "unavailable_feeds": [],
      "advisories": [],
      "labeling": {
        "outcome": "not_tried",
        "model": ""
      },
      "techniques": []
    }
  },
}

const NO_GAPS = ' Ninguno de sus Scores tiene datos faltantes.'

const GROUPS: PriorityGroup[] = [
  {
    position: 1,
    title: 'Explotadas por ransomware en el servidor web expuesto',
    reason:
      'CVE-2021-41773 y CVE-2021-42013 están en KEV desde 2021-11-03 con uso conocido por ransomware, sobre Apache HTTP Server 2.4.49 en web-01, expuesto a internet. Una sola actualización de Apache las corrige juntas.' +
      NO_GAPS,
    finding_ids: [FINDINGS.f3.finding_id, FINDINGS.f4.finding_id],
    evidence: [
      { finding_id: FINDINGS.f3.finding_id, path: '/kev/known_ransomware_campaign_use', value: 'Known' },
      { finding_id: FINDINGS.f4.finding_id, path: '/asset/exposure', value: 'internet_facing' },
    ],
    context_evidence: [],
  },
  {
    position: 2,
    title: 'Explotada por ransomware, en un activo interno de laboratorio',
    reason:
      'CVE-2024-23897 está en KEV desde 2024-08-19 con uso conocido por ransomware sobre Jenkins 2.441. Va antes que los hallazgos de pg-prod-01, que tienen mayor Score, porque esos no están en KEV; va después del servidor web porque lab-01 es interno y de criticidad low.' +
      NO_GAPS,
    finding_ids: [FINDINGS.f5.finding_id],
    evidence: [
      { finding_id: FINDINGS.f5.finding_id, path: '/kev/date_added', value: '2024-08-19' },
      { finding_id: FINDINGS.f5.finding_id, path: '/asset/criticality', value: 'low' },
    ],
    context_evidence: [],
  },
  {
    position: 3,
    title: 'Alta probabilidad de explotación en el servidor de pagos',
    reason:
      'CVE-2025-1094 tiene EPSS 0.9003 sobre PostgreSQL 15.6 en pg-prod-01, de criticidad high, que corre Pagos en línea; no está en KEV y el activo es interno.' +
      NO_GAPS +
      '\n\nSe suma CVE-2024-6387, con EPSS 0.99506 sobre Ubuntu Server 22.04 en el mismo activo; tampoco está en KEV.' +
      NO_GAPS,
    finding_ids: [FINDINGS.f1.finding_id, FINDINGS.f2.finding_id],
    evidence: [
      { finding_id: FINDINGS.f1.finding_id, path: '/epss/probability', value: '0.9003' },
      { finding_id: FINDINGS.f1.finding_id, path: '/asset/critical_services/0/name', value: 'Pagos en línea' },
      { finding_id: FINDINGS.f2.finding_id, path: '/epss/probability', value: '0.99506' },
    ],
    context_evidence: [{ path: '/risk/appetite', value: 'cautious' }],
  },
]

const JENKINS_PLAN: ActionPlan = {
  finding_id: FINDINGS.f5.finding_id,
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
    sources: FINDINGS.f5.details.references.slice(0, 1),
    attack_mitigations: [],
  },
}

const FIRST_ID = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01'

export const MOCK_PRIORITIZATIONS: Prioritization[] = [
  {
    id: '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02',
    previous_id: FIRST_ID,
    business_context_version: 1,
    created_at: '2026-11-11T09:00:00Z',
    model: 'claude-haiku-5-5',
    prompt_id: '10446cd88908',
    groups: GROUPS,
    findings: Object.values(FINDINGS),
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
    groups: GROUPS.map((g) =>
      g.position === 3
        ? { ...g, reason: g.reason.split('\n\n')[0]!, finding_ids: [FINDINGS.f1.finding_id], evidence: g.evidence.slice(0, 2) }
        : g,
    ),
    findings: Object.values(FINDINGS).filter((f) => f.finding_id !== FINDINGS.f2.finding_id),
    plans: [JENKINS_PLAN],
    feedback: [],
  },
]

/** Newest first, as GET /prioritizations lists them. */
export const prioritizationsStore = localStore<Prioritization[]>('barbattack_mock_prioritizations', MOCK_PRIORITIZATIONS)
