import { create } from 'zustand'

export type Role = 'platform_admin' | 'customer_admin' | 'viewer'

export interface AuthUser {
  id: string
  email: string
  role: Role
  customer: { id: string; name: string } | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  /** True when the backend reports the user's Customer was deactivated mid-session. */
  deactivated: boolean
  setSession: (user: AuthUser, token: string) => void
  clearSession: () => void
  setDeactivated: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  deactivated: false,
  setSession: (user, accessToken) => set({ user, accessToken, deactivated: false }),
  clearSession: () => set({ user: null, accessToken: null, deactivated: false }),
  setDeactivated: () => set({ deactivated: true }),
}))
