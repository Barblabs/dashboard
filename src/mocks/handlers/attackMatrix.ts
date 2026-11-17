import { http, HttpResponse } from 'msw'
import { apiUrl } from '../url'

const TACTICS_BASE = [
  { tactic: 'reconnaissance', critical: 0, high: 2, medium: 3, low: 1, unbanded: 0 },
  { tactic: 'resource-development', critical: 0, high: 0, medium: 1, low: 0, unbanded: 0 },
  { tactic: 'initial-access', critical: 2, high: 5, medium: 4, low: 2, unbanded: 0 },
  { tactic: 'execution', critical: 1, high: 3, medium: 2, low: 1, unbanded: 0 },
  { tactic: 'persistence', critical: 0, high: 2, medium: 3, low: 2, unbanded: 1 },
  { tactic: 'privilege-escalation', critical: 3, high: 4, medium: 2, low: 0, unbanded: 0 },
  { tactic: 'defense-evasion', critical: 0, high: 1, medium: 2, low: 1, unbanded: 0 },
  { tactic: 'credential-access', critical: 2, high: 3, medium: 1, low: 0, unbanded: 0 },
  { tactic: 'discovery', critical: 0, high: 2, medium: 4, low: 3, unbanded: 0 },
  { tactic: 'lateral-movement', critical: 1, high: 2, medium: 1, low: 0, unbanded: 0 },
  { tactic: 'collection', critical: 0, high: 1, medium: 2, low: 1, unbanded: 0 },
  { tactic: 'command-and-control', critical: 0, high: 2, medium: 3, low: 2, unbanded: 0 },
  { tactic: 'exfiltration', critical: 1, high: 1, medium: 2, low: 1, unbanded: 0 },
  { tactic: 'impact', critical: 4, high: 6, medium: 3, low: 1, unbanded: 0 },
]

const TECHNIQUES = [
  {
    attack_id: 'T1190',
    name: 'Exploit Public-Facing Application',
    findings: 7,
    roles: ['exploitation'],
    tactics: ['initial-access'],
  },
  {
    attack_id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    findings: 5,
    roles: ['exploitation'],
    tactics: ['privilege-escalation'],
  },
  {
    attack_id: 'T1110',
    name: 'Brute Force',
    findings: 4,
    roles: ['exploitation'],
    tactics: ['credential-access'],
  },
  {
    attack_id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    findings: 3,
    roles: ['primary_impact'],
    tactics: ['privilege-escalation', 'defense-evasion'],
  },
  {
    attack_id: 'T1485',
    name: 'Data Destruction',
    findings: 3,
    roles: ['primary_impact'],
    tactics: ['impact'],
  },
  {
    attack_id: 'T1595',
    name: 'Active Scanning',
    findings: 2,
    roles: ['exploitation'],
    tactics: ['reconnaissance'],
  },
  {
    attack_id: 'T1133',
    name: 'External Remote Services',
    findings: 2,
    roles: ['secondary_impact'],
    tactics: ['persistence', 'initial-access'],
  },
  {
    attack_id: 'T1021',
    name: 'Remote Services',
    findings: 2,
    roles: ['lateral-movement'],
    tactics: ['lateral-movement'],
  },
  {
    attack_id: 'T1046',
    name: 'Network Service Discovery',
    findings: 1,
    roles: ['exploitation'],
    tactics: ['discovery'],
  },
  {
    attack_id: 'T1489',
    name: 'Service Stop',
    findings: 1,
    roles: ['primary_impact'],
    tactics: ['impact'],
  },
]

const RESPONSE_ALL = {
  coverage: { labeled: 22, open: 35 },
  tactics: TACTICS_BASE,
  techniques: TECHNIQUES,
}

export const attackMatrixHandlers = [
  http.get(apiUrl('/findings/attack-matrix'), () => HttpResponse.json(RESPONSE_ALL)),
]
