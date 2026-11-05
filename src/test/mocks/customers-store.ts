import type { CustomerResponse } from '../../api/customers'

const STORAGE_KEY = 'barbattack_mock_customers'

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

export function loadCustomers(): CustomerResponse[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as CustomerResponse[]) : MOCK_CUSTOMERS
}

export function saveCustomers(customers: CustomerResponse[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers))
}
