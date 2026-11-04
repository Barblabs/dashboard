import { http, HttpResponse } from 'msw'
import type { CustomerResponse } from '../../../api/customers'
import { loadCustomers, saveCustomers } from '../customers-store'
import { apiUrl } from '../url'

function failure(status: number, code: string, error: string) {
  return HttpResponse.json({ code, error }, { status })
}

export const customersHandlers = [
  http.get(apiUrl('/customers'), () => {
    return HttpResponse.json({ customers: loadCustomers() })
  }),

  http.post(apiUrl('/customers'), async ({ request }) => {
    const { name, admin_email } = (await request.json()) as { name: string; admin_email: string }
    const customers = loadCustomers()
    if (customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return failure(409, 'customer_name_taken', 'a customer with this name already exists')
    }
    const created: CustomerResponse = {
      id: `customer-${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      deactivated_at: null,
    }
    // Invite the admin_email: in real backend this sends an email; here we just ignore it.
    void admin_email
    saveCustomers([...customers, created])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(apiUrl('/customers/:id'), async ({ params, request }) => {
    const id = params['id'] as string
    const { name } = (await request.json()) as { name: string }
    const customers = loadCustomers()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    if (customers.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      return failure(409, 'customer_name_taken', 'a customer with this name already exists')
    }
    const updated = { ...customer, name }
    saveCustomers(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),

  http.post(apiUrl('/customers/:id/deactivate'), ({ params }) => {
    const id = params['id'] as string
    const customers = loadCustomers()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    const updated = { ...customer, deactivated_at: new Date().toISOString() }
    saveCustomers(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),

  http.post(apiUrl('/customers/:id/reactivate'), ({ params }) => {
    const id = params['id'] as string
    const customers = loadCustomers()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    const updated = { ...customer, deactivated_at: null }
    saveCustomers(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),
]
