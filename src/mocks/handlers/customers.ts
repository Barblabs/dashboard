import { http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import type { CustomerResponse } from '../../api/customers'
import type { Known, Schemas } from '../../api/schemas'
import { customersStore } from '../customers-store'
import { apiUrl } from '../url'
import { failure, parsedBody } from './responses'

const createBody = z.object({ name: z.string(), admin_email: z.string() }) satisfies ZodType<
  Known<Schemas['CreateCustomerRequest']>
>
const renameBody = z.object({ name: z.string() }) satisfies ZodType<Known<Schemas['RenameCustomerRequest']>>

export const customersHandlers = [
  http.get(apiUrl('/customers'), () => {
    return HttpResponse.json({ customers: customersStore.load() })
  }),

  http.post(apiUrl('/customers'), async ({ request }) => {
    const body = await parsedBody(request, createBody)
    if (body instanceof Response) return body
    const { name } = body
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

  http.patch<{ id: string }>(apiUrl('/customers/:id'), async ({ params, request }) => {
    const body = await parsedBody(request, renameBody)
    if (body instanceof Response) return body
    const { name } = body
    const { id } = params
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

  http.post<{ id: string }>(apiUrl('/customers/:id/deactivate'), ({ params }) => {
    const { id } = params
    const customers = customersStore.load()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    const updated = { ...customer, deactivated_at: new Date().toISOString() }
    customersStore.save(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),

  http.post<{ id: string }>(apiUrl('/customers/:id/reactivate'), ({ params }) => {
    const { id } = params
    const customers = customersStore.load()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return failure(404, 'customer_not_found', 'customer not found')
    const updated = { ...customer, deactivated_at: null }
    customersStore.save(customers.map((c) => (c.id === id ? updated : c)))
    return HttpResponse.json(updated)
  }),
]
