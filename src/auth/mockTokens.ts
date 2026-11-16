import { everyOf, isOneOf } from '../api/schemas'
import type { Role } from './store'
import { onStorageKeyRemoved } from './storageEvents'
import type { Tokens } from './tokens'

/*
 * In mock mode the role picked on the sign-in page stands in for Cognito's tokens, and the
 * mock backend answers /me as that role. It lives in localStorage like the tokens do, so
 * reloads, new tabs and signing out elsewhere behave the same.
 */
export const MOCK_ROLE_KEY = 'barbattack_mock_role'

export const MOCK_ROLES = everyOf<Role>()(['platform_admin', 'customer_admin', 'viewer'])

export function setMockRole(role: Role) {
  localStorage.setItem(MOCK_ROLE_KEY, role)
}

export function storedMockRole(): Role | null {
  const stored = localStorage.getItem(MOCK_ROLE_KEY)
  return stored !== null && isOneOf(MOCK_ROLES, stored) ? stored : null
}

export const mockTokens: Tokens = {
  hasStored: () => storedMockRole() !== null,
  currentAccessToken: () => Promise.resolve(storedMockRole() === null ? null : 'mock-access-token'),
  forget: () => {
    localStorage.removeItem(MOCK_ROLE_KEY)
    return Promise.resolve()
  },
  onForgottenElsewhere: (listener) => onStorageKeyRemoved(MOCK_ROLE_KEY, listener),
}
