import { ApiError } from '../api/client'
import { fetchMe } from '../api/me'
import { forgetTokens } from './cognito'
import { useAuthStore, type AuthUser } from './store'

export type SignInFailure = 'login.errors.userDisabled' | 'login.errors.network'

export type SignInOutcome = { ok: true; user: AuthUser } | { ok: false; error: SignInFailure }

/*
 * Turns a Cognito token into a session: the backend decides who the token belongs to.
 * While it answers the session is `verifying`, so the request carries the token.
 */
export async function completeSignIn(accessToken: string): Promise<SignInOutcome> {
  useAuthStore.getState().beginVerification(accessToken)
  try {
    const me = await fetchMe()
    const user: AuthUser = { id: me.id, email: me.email, role: me.role, customer: me.customer }
    useAuthStore.getState().establishSession(user, accessToken)
    return { ok: true, user }
  } catch (error) {
    signOut()
    const rejected = error instanceof ApiError && error.failure.kind === 'http' && error.failure.status === 401
    return { ok: false, error: rejected ? 'login.errors.userDisabled' : 'login.errors.network' }
  }
}

// The one way out, from any state: the app clears its cached data when the session ends.
export function signOut() {
  forgetTokens()
  useAuthStore.getState().endSession()
}
