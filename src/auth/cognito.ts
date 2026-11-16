import { Amplify } from 'aws-amplify'
import { confirmSignIn, fetchAuthSession, signIn as amplifySignIn, type SignInOutput } from 'aws-amplify/auth'
import { singleFlight } from './singleFlight'
import { onStorageKeyRemoved } from './storageEvents'
import { TokensUnreachable, type Tokens } from './tokens'

const REGION = import.meta.env.VITE_COGNITO_REGION as string
const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID as string
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string

// Amplify's own key layout in localStorage, its default storage.
const KEY_PREFIX = `CognitoIdentityServiceProvider.${CLIENT_ID}`
const LAST_AUTH_USER_KEY = `${KEY_PREFIX}.LastAuthUser`

// Done on first use: mock mode never configures Cognito, and Amplify rejects missing ids.
let configured = false

function configure() {
  if (configured) return
  Amplify.configure({ Auth: { Cognito: { userPoolId: USER_POOL_ID, userPoolClientId: CLIENT_ID } } })
  configured = true
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
  configure()
  const { nextStep } = await amplifySignIn({ username: email, password })
  return resultOf(nextStep)
}

export async function completeNewPassword(newPassword: string): Promise<void> {
  configure()
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
  configure()
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
  const refreshToken = localStorage.getItem(`${KEY_PREFIX}.${localStorage.getItem(LAST_AUTH_USER_KEY)}.refreshToken`)
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`${KEY_PREFIX}.`)) localStorage.removeItem(key)
  }
  return refreshToken
}

// Amplify's own signOut revokes before it clears storage, retrying while Cognito is unreachable.
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
  const refreshToken = clearStorage()
  if (!refreshToken) return
  try {
    await revoke(refreshToken)
  } catch {
    // Best effort: the local session is already over, and the token expires on its own.
  }
}

export const cognitoTokens: Tokens = {
  hasStored: () => localStorage.getItem(LAST_AUTH_USER_KEY) !== null,
  currentAccessToken,
  forget,
  onForgottenElsewhere: (listener) => onStorageKeyRemoved(LAST_AUTH_USER_KEY, listener),
}
