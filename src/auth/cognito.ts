import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
  type IAuthenticationCallback,
} from 'amazon-cognito-identity-js'
import { singleFlight } from './singleFlight'
import { onStorageKeyRemoved } from './storageEvents'
import { TokensUnreachable, type Tokens } from './tokens'

const REGION = import.meta.env.VITE_COGNITO_REGION as string
const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID as string
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string

// The SDK's own key layout in localStorage, its default storage.
const KEY_PREFIX = `CognitoIdentityServiceProvider.${CLIENT_ID}`
const LAST_AUTH_USER_KEY = `${KEY_PREFIX}.LastAuthUser`

// Built on first use: mock mode never configures Cognito, and the pool rejects missing ids.
let poolInstance: CognitoUserPool | null = null

function pool(): CognitoUserPool {
  poolInstance ??= new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID })
  return poolInstance
}

export type SignInResult =
  | { kind: 'success' }
  | { kind: 'newPasswordRequired'; cognitoUser: CognitoUser; userAttributes: Record<string, string> }

// On success the SDK has stored the tokens; `cognitoTokens` hands them out from there.
export function signIn(email: string, password: string): Promise<SignInResult> {
  const cognitoUser = new CognitoUser({ Username: email, Pool: pool() })
  const authDetails = new AuthenticationDetails({ Username: email, Password: password })

  return new Promise((resolve, reject) => {
    const callbacks: IAuthenticationCallback = {
      onSuccess() {
        resolve({ kind: 'success' })
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

export function completeNewPassword(cognitoUser: CognitoUser, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess() {
        resolve()
      },
      onFailure(err) {
        reject(err)
      },
    })
  })
}

/*
 * Failures that say nothing about the session: Cognito was not reached, or could not answer
 * for now. Any other failure to renew (an expired or revoked refresh token, a deleted user)
 * means the session is over.
 */
const TRANSIENT_FAILURES = new Set(['NetworkError', 'InternalErrorException', 'TooManyRequestsException'])

function isTransient(error: Error): boolean {
  const code = (error as Error & { code?: unknown }).code
  return typeof code === 'string' && TRANSIENT_FAILURES.has(code)
}

/*
 * A fresh CognitoUser reads the tokens from storage every time, so a renewal made by
 * another tab is picked up here too. `getSession` renews the access token if it expired.
 */
function readAccessToken(): Promise<string | null> {
  const user = pool().getCurrentUser()
  if (!user) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (session) resolve(session.getAccessToken().getJwtToken())
      else if (error && isTransient(error)) reject(new TokensUnreachable(error))
      else resolve(null)
    })
  })
}

// Requests that find the token expired at the same time wait on a single renewal.
const currentAccessToken = singleFlight(readAccessToken)

// RevokeToken is a public, unauthenticated Cognito operation the SDK's typings do not expose.
async function revoke(refreshToken: string) {
  await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.RevokeToken',
    },
    body: JSON.stringify({ Token: refreshToken, ClientId: CLIENT_ID }),
  })
}

/*
 * Clearing storage comes first and is synchronous: a reload or another tab can no longer
 * restore the session, whatever happens to the revocation.
 */
async function forget() {
  const user = pool().getCurrentUser()
  if (!user) return
  const refreshToken = localStorage.getItem(`${KEY_PREFIX}.${user.getUsername()}.refreshToken`)
  user.signOut()
  if (!refreshToken) return
  try {
    await revoke(refreshToken)
  } catch {
    // Best effort: the local session is already over, and the token expires on its own.
  }
}

export const cognitoTokens: Tokens = {
  hasStored: () => pool().getCurrentUser() !== null,
  currentAccessToken,
  forget,
  onForgottenElsewhere: (listener) => onStorageKeyRemoved(LAST_AUTH_USER_KEY, listener),
}
