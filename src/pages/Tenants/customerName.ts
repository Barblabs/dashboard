import { z } from 'zod'

export const nameSchema = z.object({
  name: z.string().trim().min(1, 'tenants.create.step1.required'),
})

export type NameFields = z.infer<typeof nameSchema>
