import { useAuthStore } from './store'
import { tokens } from './tokenSource'

/*
 * The one way out, from any state. Forgetting clears the stored tokens before it returns,
 * so the revocation is left to finish on its own; the app clears its cached data when the
 * session ends.
 */
export function signOut() {
  void tokens.forget()
  useAuthStore.getState().endSession()
}
