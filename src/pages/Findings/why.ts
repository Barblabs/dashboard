import { z } from 'zod'

/** As long as the backend takes, for Feedback and for a close by hand. */
const MAX_WHY = 2000

/** Required, and blanks alone do not count: the Prioritizer, or the next User, reads it. */
export const whySchema = z
  .string()
  .max(MAX_WHY, 'findings.why.tooLong')
  .refine((why) => why.trim() !== '', 'findings.why.required')

export function hasWhy(why: string): boolean {
  return why.trim() !== ''
}
