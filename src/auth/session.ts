import { authOutcomeOf } from '../api/client'
import { fetchMe } from '../api/me'
import { signOut } from './signOut'
import { singleFlight } from './singleFlight'
import { useAuthStore } from './store'
import { tokens } from './tokenSource'

/*
 * Where asking the backend about the stored tokens leaves things:
 *   settled     - signed in, or deactivated
 *   rejected    - the backend answered 401, or Cognito would not renew them: signed out
 *   unreachable - no answer worth acting on (the network, a 5xx, Cognito out of reach);
 *                 the session is left for the caller to decide
 * Signing in and restoring agree on everything but `unreachable`.
 */
type Verification = 'settled' | 'rejected' | 'unreachable'

async function verifyStoredTokens(): Promise<Verification> {
  const store = useAuthStore.getState()
  try {
    if ((await tokens.currentAccessToken()) === null) return reject()
    store.establishSession(await fetchMe())
    return 'settled'
  } catch (error) {
    switch (authOutcomeOf(error)) {
      case 'rejected':
        return reject()
      case 'deactivated':
        store.deactivate()
        return 'settled'
      case null:
        return 'unreachable'
    }
  }
}

function reject(): Verification {
  signOut()
  return 'rejected'
}

const SIGN_IN_FAILURES = {
  rejected: 'login.errors.userDisabled',
  unreachable: 'login.errors.network',
} as const satisfies Record<Exclude<Verification, 'settled'>, string>

export type SignInFailure = (typeof SIGN_IN_FAILURES)[keyof typeof SIGN_IN_FAILURES]

/*
 * Turns freshly stored tokens into a session: the backend decides who they belong to.
 * Returns why signing in failed, or `null` once the session moved on. Unlike restoring,
 * a backend out of reach forgets the tokens too: the sign-in did not happen.
 */
export async function completeSignIn(): Promise<SignInFailure | null> {
  useAuthStore.getState().beginVerification()
  const verification = await verifyStoredTokens()
  if (verification === 'settled') return null
  if (verification === 'unreachable') signOut()
  return SIGN_IN_FAILURES[verification]
}

/*
 * Picks up the tokens kept from an earlier visit. Unlike signing in, a backend out of reach
 * keeps them for a retry: a brief outage must not sign anyone out.
 */
async function restore() {
  if (!tokens.hasStored()) {
    useAuthStore.getState().endSession()
    return
  }
  if ((await verifyStoredTokens()) === 'unreachable') useAuthStore.getState().becomeUnreachable()
}

// One restoration at a time, however many times the app asks while one is under way.
export const restoreSession = singleFlight(restore)
