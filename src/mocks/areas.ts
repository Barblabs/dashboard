import type { Area } from '../api/areas'
import { SOURCE_ID } from './assets'

// Ids and names match the `area` of the asset fixtures.
export const mockAreas: Area[] = [
  {
    id: 1,
    source_id: SOURCE_ID,
    record_id: 'ORG-001',
    name: 'Infrastructure',
    owner_email: 'infra-lead@example.com',
    active: true,
    inactive_since: null,
  },
  {
    id: 3,
    source_id: SOURCE_ID,
    record_id: 'ORG-003',
    name: 'Legacy ERP',
    owner_email: 'erp-owner@example.com',
    active: false,
    inactive_since: '2026-09-01T12:00:00Z',
  },
  {
    id: 2,
    source_id: SOURCE_ID,
    record_id: 'ORG-002',
    name: 'Data Platform',
    owner_email: null,
    active: true,
    inactive_since: null,
  },
]
