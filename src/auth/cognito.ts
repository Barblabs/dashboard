import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type IAuthenticationCallback,
} from 'amazon-cognito-identity-js'

const REGION = import.meta.env.VITE_COGNITO_REGION as string
const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID as string
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string

// Tokens live only in memory — not in localStorage or sessionStorage.
const mem = new Map<string, string>()
const MemoryStorage = {
  setItem: (key: string, value: string) => { mem.set(key, value) },
  getItem: (key: string) => mem.get(key) ?? null,
  removeItem: (key: string) => { mem.delete(key) },
  clear: () => { mem.clear() },
}

function makePool() {
  return new CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID,
    Storage: MemoryStorage as Storage,
  })
}

function makeUser(email: string) {
  return new CognitoUser({
    Username: email,
    Pool: makePool(),
    Storage: MemoryStorage as Storage,
  })
}

export type SignInResult =
  | { kind: 'success'; accessToken: string }
  | { kind: 'newPasswordRequired'; cognitoUser: CognitoUser; userAttributes: Record<string, string> }

export function signIn(email: string, password: string): Promise<SignInResult> {
  const cognitoUser = makeUser(email)
  const authDetails = new AuthenticationDetails({ Username: email, Password: password })

  return new Promise((resolve, reject) => {
    const callbacks: IAuthenticationCallback = {
      onSuccess(session) {
        resolve({ kind: 'success', accessToken: session.getAccessToken().getJwtToken() })
      },
      onFailure(err) {
        reject(err)
      },
      newPasswordRequired(userAttributes: Record<string, string>) {
        resolve({ kind: 'newPasswordRequired', cognitoUser, userAttributes })
      },
    }
    cognitoUser.authenticateUser(authDetails, callbacks)
  })
}

export function completeNewPassword(
  cognitoUser: CognitoUser,
  newPassword: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess(session) {
        resolve(session.getAccessToken().getJwtToken())
      },
      onFailure(err) {
        reject(err)
      },
    })
  })
}

export function signOut(email: string) {
  const user = makeUser(email)
  user.signOut()
  mem.clear()
}

// In dev mode: expose a helper to test token refresh from the browser console.
// Usage: window.forceTokenRefresh() — watch for InitiateAuth with REFRESH_TOKEN_AUTH in Network.
if (import.meta.env.DEV) {
  const pool = makePool()
  ;(window as unknown as Record<string, unknown>)['forceTokenRefresh'] = () => {
    const user = pool.getCurrentUser()
    if (!user) { console.warn('No current user in memory'); return }
    user.getSession((err: Error | null, session: { getAccessToken(): { getExpiration(): number } } | null) => {
      if (err) { console.error('Refresh failed', err); return }
      const exp = session?.getAccessToken().getExpiration() ?? 0
      console.log('Token refreshed. Expires at:', new Date(exp * 1000).toLocaleTimeString())
    })
  }
}

export { REGION, USER_POOL_ID, CLIENT_ID }
