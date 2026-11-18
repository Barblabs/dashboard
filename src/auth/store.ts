import { create } from 'zustand'
import type { MeResponse } from '../api/me'

/** Who the backend says the tokens belong to. */
export type AuthUser = MeResponse
export type Role = AuthUser['role']

/*
 * The lifecycle of a session, one state at a time:
 *   restoring -> signedIn | deactivated | signedOut | unreachable
 *   unreachable -> restoring
 *   signedOut -> verifying -> signedIn -> deactivated
 * and any state -> signedOut. The tokens are not part of it: they are asked for per request.
 */
export type Session =
  /** On startup, while the backend says who the tokens kept from a previous visit belong to. */
  | { status: 'restoring' }
  /** The backend could not be reached while restoring; the tokens are kept for a retry. */
  | { status: 'unreachable' }
  | { status: 'signedOut' }
  /** Just signed in: the backend has not yet said who the new tokens belong to. */
  | { status: 'verifying' }
  | { status: 'signedIn'; user: AuthUser }
  /** The backend reported the user's Customer deactivated; only signing out is left. */
  | { status: 'deactivated' }

type Status = Session['status']

interface AuthState {
  session: Session
  retryRestoring: () => void
  becomeUnreachable: () => void
  beginVerification: () => void
  establishSession: (user: AuthUser) => void
  deactivate: () => void
  endSession: () => void
}

/*
 * Each transition only leaves the states listed for it, so an answer arriving after the
 * session moved on (say, signed out from another tab) changes nothing.
 */
function from(allowed: Status[], next: Session) {
  return ({ session }: { session: Session }) => (allowed.includes(session.status) ? { session: next } : {})
}

export const useAuthStore = create<AuthState>((set) => ({
  session: { status: 'restoring' },
  retryRestoring: () => set(from(['unreachable'], { status: 'restoring' })),
  becomeUnreachable: () => set(from(['restoring'], { status: 'unreachable' })),
  beginVerification: () => set(from(['signedOut'], { status: 'verifying' })),
  establishSession: (user) => set(from(['restoring', 'verifying'], { status: 'signedIn', user })),
  deactivate: () => set(from(['restoring', 'verifying', 'signedIn'], { status: 'deactivated' })),
  endSession: () => set({ session: { status: 'signedOut' } }),
}))

/** The signed-in user, or `null` in every other state. */
export function useCurrentUser(): AuthUser | null {
  return useAuthStore((s) => (s.session.status === 'signedIn' ? s.session.user : null))
}
