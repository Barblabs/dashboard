import { Amplify } from 'aws-amplify'
import { confirmSignIn, fetchAuthSession, signIn as amplifySignIn, type SignInOutput } from 'aws-amplify/auth'
import { singleFlight } from './singleFlight'
import { onStorageKeyRemoved } from './storageEvents'
import { TokensUnreachable, type Tokens } from './tokens'

interface CognitoSettings {
  region: string
  userPoolId: string
  clientId: string
}

let settings: CognitoSettings | null = null

/*
 * Read on first use, not on import: mock mode imports this module too and sets none of them.
 * Amplify is configured with them once they are known to be there, since it rejects missing ids.
 */
function cognito(): CognitoSettings {
  if (settings) return settings
  const {
    VITE_COGNITO_REGION: region,
    VITE_COGNITO_USER_POOL_ID: userPoolId,
    VITE_COGNITO_CLIENT_ID: clientId,
  } = import.meta.env
  if (!region || !userPoolId || !clientId) {
    throw new Error('VITE_COGNITO_REGION, VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID must be set outside mock mode')
  }
  Amplify.configure({ Auth: { Cognito: { userPoolId, userPoolClientId: clientId } } })
  settings = { region, userPoolId, clientId }
  return settings
}

// Amplify's own key layout in localStorage, its default storage.
function keyPrefix() {
  return `CognitoIdentityServiceProvider.${cognito().clientId}`
}

function lastAuthUserKey() {
  return `${keyPrefix()}.LastAuthUser`
}

export type SignInResult = 'success' | 'newPasswordRequired'

type NextStep = SignInOutput['nextStep']

class UnsupportedSignInStep extends Error {
  constructor(step: NextStep['signInStep']) {
    super(`Signing in needs a step this app does not support: ${step}`)
    this.name = 'UnsupportedSignInStep'
  }
}

function resultOf({ signInStep }: NextStep): SignInResult {
  if (signInStep === 'DONE') return 'success'
  if (signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') return 'newPasswordRequired'
  throw new UnsupportedSignInStep(signInStep)
}

/*
 * On success Amplify has stored the tokens; `cognitoTokens` hands them out from there.
 * Amplify keeps a pending challenge in memory, so `completeNewPassword` needs nothing back.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  cognito()
  const { nextStep } = await amplifySignIn({ username: email, password })
  return resultOf(nextStep)
}

export async function completeNewPassword(newPassword: string): Promise<void> {
  cognito()
  const { nextStep } = await confirmSignIn({ challengeResponse: newPassword })
  if (nextStep.signInStep !== 'DONE') throw new UnsupportedSignInStep(nextStep.signInStep)
}

/*
 * Failures that say nothing about the session: Cognito was not reached, or could not answer
 * for now. Any other failure to renew (an expired or revoked refresh token, a deleted user)
 * means the session is over.
 */
const TRANSIENT_FAILURES = new Set(['NetworkError', 'InternalErrorException', 'TooManyRequestsException'])

function isTransient(error: unknown): boolean {
  return error instanceof Error && TRANSIENT_FAILURES.has(error.name)
}

/*
 * Amplify reads the tokens from storage every time, so a renewal made by another tab is
 * picked up here too, and renews the access token if it expired. It keeps the tokens after
 * some failures that end the session, so those clear storage here.
 */
async function readAccessToken(): Promise<string | null> {
  cognito()
  try {
    const { tokens } = await fetchAuthSession()
    if (tokens) return tokens.accessToken.toString()
  } catch (error) {
    if (isTransient(error)) throw new TokensUnreachable(error)
  }
  clearStorage()
  return null
}

// Requests that find the token expired at the same time wait on a single renewal.
const currentAccessToken = singleFlight(readAccessToken)

// Returns the refresh token it removed, if there was one.
function clearStorage(): string | null {
  const prefix = keyPrefix()
  const refreshToken = localStorage.getItem(`${prefix}.${localStorage.getItem(lastAuthUserKey())}.refreshToken`)
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`${prefix}.`)) localStorage.removeItem(key)
  }
  return refreshToken
}

// Amplify's own signOut revokes before it clears storage, retrying while Cognito is unreachable.
async function revoke(refreshToken: string) {
  const { region, clientId } = cognito()
  await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.RevokeToken',
    },
    body: JSON.stringify({ Token: refreshToken, ClientId: clientId }),
  })
}

/*
 * Clearing storage comes first and is synchronous: a reload or another tab can no longer
 * restore the session, whatever happens to the revocation.
 */
async function forget() {
  const refreshToken = clearStorage()
  if (!refreshToken) return
  try {
    await revoke(refreshToken)
  } catch {
    // Best effort: the local session is already over, and the token expires on its own.
  }
}

export const cognitoTokens: Tokens = {
  hasStored: () => localStorage.getItem(lastAuthUserKey()) !== null,
  currentAccessToken,
  forget,
  onForgottenElsewhere: (listener) => onStorageKeyRemoved(lastAuthUserKey(), listener),
}
