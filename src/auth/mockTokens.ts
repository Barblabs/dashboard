import { forgetMockRole, hasMockRole, MOCK_ROLE_KEY } from '../test/mocks/handlers/auth'
import type { Tokens } from './tokens'
import { onStorageKeyRemoved } from './storageEvents'

const MOCK_ACCESS_TOKEN = 'mock-access-token'

// The picked mock role is the whole session: having one is having a token.
export const mockTokens: Tokens = {
  hasStored: hasMockRole,
  currentAccessToken: () => Promise.resolve(hasMockRole() ? MOCK_ACCESS_TOKEN : null),
  forget: () => {
    forgetMockRole()
    return Promise.resolve()
  },
  onForgottenElsewhere: (listener) => onStorageKeyRemoved(MOCK_ROLE_KEY, listener),
}
