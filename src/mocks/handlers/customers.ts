import { http, HttpResponse } from 'msw'
import type { CustomerResponse } from '../../api/customers'
import { customersStore } from '../customers-store'
import { apiUrl } from '../url'
import { failure } from './responses'

export const customersHandlers = [
  http.get(apiUrl('/customers'), () => {
    return HttpResponse.json({ customers: customersStore.load() })
  }),

  http.post(apiUrl('/customers'), async ({ request }) => {
    const { name } = (await request.json()) as { name: string }
    const customers = customersStore.load()
    if (customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return failure(409, 'customer_name_taken', 'a customer with this name already exists')
    }
    const created: CustomerResponse = {
      id: `customer-${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      deactivated_at: null,
    }
    customersStore.save([...customers, created])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(apiUrl('/customers/:id'), async ({ params, request }) => {
    const id = params['id'] as string
    const { name } = (await request.json()) as { name: string }
    const customers = customersStore.load()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    if (customers.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      return failure(409, 'customer_name_taken', 'a customer with this name already exists')
    }
    const updated = { ...customer, name }
    customersStore.save(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),

  http.post(apiUrl('/customers/:id/deactivate'), ({ params }) => {
    const id = params['id'] as string
    const customers = customersStore.load()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    const updated = { ...customer, deactivated_at: new Date().toISOString() }
    customersStore.save(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),

  http.post(apiUrl('/customers/:id/reactivate'), ({ params }) => {
    const id = params['id'] as string
    const customers = customersStore.load()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    const updated = { ...customer, deactivated_at: null }
    customersStore.save(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),
]
