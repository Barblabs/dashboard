import { ApiError } from '../api/client'
import { fetchMe } from '../api/me'
import { signOut } from './signOut'
import { useAuthStore, type AuthUser } from './store'
import { tokens } from './tokenSource'

export type SignInFailure = 'login.errors.userDisabled' | 'login.errors.network'

// What the backend says about the stored tokens.
type Identity =
  | { kind: 'user'; user: AuthUser }
  /** The tokens are no good: the backend answered 401, or Cognito would not renew them. */
  | { kind: 'rejected' }
  | { kind: 'deactivated' }
  /** No answer worth acting on: the network, a 5xx, or Cognito could not be reached. */
  | { kind: 'unreachable' }

async function identify(): Promise<Identity> {
  try {
    if ((await tokens.currentAccessToken()) === null) return { kind: 'rejected' }
    const me = await fetchMe()
    return { kind: 'user', user: { id: me.id, email: me.email, role: me.role, customer: me.customer } }
  } catch (error) {
    if (error instanceof ApiError && error.failure.kind === 'http') {
      const { status, code } = error.failure
      if (status === 401) return { kind: 'rejected' }
      if (status === 403 && code === 'customer_deactivated') return { kind: 'deactivated' }
    }
    return { kind: 'unreachable' }
  }
}

/*
 * Turns freshly stored tokens into a session: the backend decides who they belong to.
 * Returns why signing in failed, or `null` once the session moved on (signed in or
 * deactivated). Unlike restoring, any failure here forgets the tokens.
 */
export async function completeSignIn(): Promise<SignInFailure | null> {
  const store = useAuthStore.getState()
  store.beginVerification()
  const identity = await identify()
  switch (identity.kind) {
    case 'user':
      store.establishSession(identity.user)
      return null
    case 'deactivated':
      store.deactivate()
      return null
    case 'rejected':
      signOut()
      return 'login.errors.userDisabled'
    case 'unreachable':
      signOut()
      return 'login.errors.network'
  }
}

/*
 * Picks up the tokens kept from an earlier visit. Unlike signing in, a backend out of reach
 * keeps them for a retry: a brief outage must not sign anyone out.
 */
async function restore() {
  const store = useAuthStore.getState()
  if (!tokens.hasStored()) {
    store.endSession()
    return
  }
  const identity = await identify()
  switch (identity.kind) {
    case 'user':
      store.establishSession(identity.user)
      return
    case 'deactivated':
      store.deactivate()
      return
    case 'rejected':
      signOut()
      return
    case 'unreachable':
      store.becomeUnreachable()
      return
  }
}

let pendingRestore: Promise<void> | null = null

// One restoration at a time, however many times the app asks while one is under way.
export function restoreSession(): Promise<void> {
  pendingRestore ??= restore().finally(() => {
    pendingRestore = null
  })
  return pendingRestore
}
