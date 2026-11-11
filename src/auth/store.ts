import { create } from 'zustand'

export type Role = 'platform_admin' | 'customer_admin' | 'viewer'

export interface AuthUser {
  id: string
  email: string
  role: Role
  customer: { id: string; name: string } | null
}

/*
 * The lifecycle of a sign-in, one state at a time:
 *   signedOut -> verifying -> signedIn -> deactivated
 * and any state -> signedOut. `verifying` holds a Cognito token the backend has not
 * yet resolved to a user; requests carry it, but no route treats it as signed in.
 */
export type Session =
  | { status: 'signedOut' }
  | { status: 'verifying'; accessToken: string }
  | { status: 'signedIn'; user: AuthUser; accessToken: string }
  /** The backend reported the user's Customer deactivated mid-session; only signing out is left. */
  | { status: 'deactivated'; user: AuthUser }

interface AuthState {
  session: Session
  beginVerification: (accessToken: string) => void
  establishSession: (user: AuthUser, accessToken: string) => void
  deactivate: () => void
  endSession: () => void
}

const SIGNED_OUT: Session = { status: 'signedOut' }

export const useAuthStore = create<AuthState>((set) => ({
  session: SIGNED_OUT,
  beginVerification: (accessToken) => set({ session: { status: 'verifying', accessToken } }),
  establishSession: (user, accessToken) => set({ session: { status: 'signedIn', user, accessToken } }),
  // Only a signed-in user can be deactivated: a late 403 after signing out changes nothing.
  deactivate: () =>
    set(({ session }) =>
      session.status === 'signedIn' ? { session: { status: 'deactivated', user: session.user } } : {},
    ),
  endSession: () => set({ session: SIGNED_OUT }),
}))

export function accessTokenOf(session: Session): string | null {
  return session.status === 'verifying' || session.status === 'signedIn' ? session.accessToken : null
}

/** The signed-in user, or `null` in every other state. */
export function useCurrentUser(): AuthUser | null {
  return useAuthStore((s) => (s.session.status === 'signedIn' ? s.session.user : null))
}
