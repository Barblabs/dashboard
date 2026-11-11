import type { CustomerResponse } from '../api/customers'
import { localStore } from './localStore'

export const MOCK_CUSTOMERS: CustomerResponse[] = [
  {
    id: 'customer-1',
    name: 'Acme Corp',
    created_at: '2026-09-05T00:00:00Z',
    deactivated_at: null,
  },
  {
    id: 'customer-2',
    name: 'Beta Ltd',
    created_at: '2026-10-10T00:00:00Z',
    deactivated_at: null,
  },
  {
    id: 'customer-3',
    name: 'Gamma Inc',
    created_at: '2026-11-01T00:00:00Z',
    deactivated_at: '2026-11-02T00:00:00Z',
  },
]

export const { load: loadCustomers, save: saveCustomers } = localStore(
  'barbattack_mock_customers',
  MOCK_CUSTOMERS,
)
