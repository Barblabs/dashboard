import { useCurrentUser } from './store'

/** Whether the signed-in user may change the Customer's data; everyone else only reads it. */
export function useCanEdit(): boolean {
  return useCurrentUser()?.role === 'customer_admin'
}
