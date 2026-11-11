import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { cognitoTokens } from './cognito'
import { TokensUnreachable } from './tokens'

const COGNITO = 'https://cognito-idp.us-east-1.amazonaws.com/'
const PREFIX = 'CognitoIdentityServiceProvider.test-client-id'
const USERNAME = 'user-1'

function encode(value: object) {
  return btoa(JSON.stringify(value)).replace(/=+$/, '')
}

function jwt(claims: Record<string, unknown>) {
  return `${encode({ alg: 'none' })}.${encode(claims)}.signature`
}

function tokenExpiringIn(seconds: number, name: string) {
  const now = Math.floor(Date.now() / 1000)
  return jwt({ sub: USERNAME, name, iat: now - 60, exp: now + seconds })
}

function storeSession({ expiresIn }: { expiresIn: number }) {
  localStorage.setItem(`${PREFIX}.LastAuthUser`, USERNAME)
  localStorage.setItem(`${PREFIX}.${USERNAME}.idToken`, tokenExpiringIn(expiresIn, 'stored-id'))
  localStorage.setItem(`${PREFIX}.${USERNAME}.accessToken`, tokenExpiringIn(expiresIn, 'stored-access'))
  localStorage.setItem(`${PREFIX}.${USERNAME}.refreshToken`, 'stored-refresh-token')
  localStorage.setItem(`${PREFIX}.${USERNAME}.clockDrift`, '0')
}

const RENEWED_ACCESS_TOKEN = tokenExpiringIn(3600, 'renewed-access')

// Answers Cognito's API by operation and records each call.
function cognito(answer: (operation: string, body: Record<string, unknown>) => Response) {
  const calls: { operation: string; body: Record<string, unknown> }[] = []
  server.use(
    http.post(COGNITO, async ({ request }) => {
      const operation = (request.headers.get('X-Amz-Target') ?? '').split('.').pop() ?? ''
      const body = (await request.json()) as Record<string, unknown>
      calls.push({ operation, body })
      return answer(operation, body)
    }),
  )
  return calls
}

function renewing() {
  return cognito(() =>
    HttpResponse.json({
      AuthenticationResult: {
        AccessToken: RENEWED_ACCESS_TOKEN,
        IdToken: tokenExpiringIn(3600, 'renewed-id'),
        ExpiresIn: 3600,
        TokenType: 'Bearer',
      },
    }),
  )
}

function cognitoError(status: number, type: string) {
  return HttpResponse.json({ __type: type, message: type }, { status })
}

function storedKeys() {
  return Object.keys(localStorage).filter((key) => key.startsWith(PREFIX))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Cognito tokens', () => {
  it('has nothing stored before signing in', async () => {
    expect(cognitoTokens.hasStored()).toBe(false)
    expect(await cognitoTokens.currentAccessToken()).toBeNull()
  })

  it('hands out the stored access token while it is valid', async () => {
    const calls = renewing()
    storeSession({ expiresIn: 3600 })

    expect(cognitoTokens.hasStored()).toBe(true)
    expect(await cognitoTokens.currentAccessToken()).toBe(localStorage.getItem(`${PREFIX}.${USERNAME}.accessToken`))
    expect(calls).toHaveLength(0)
  })

  it('renews an expired access token once for all the requests waiting on it', async () => {
    const calls = renewing()
    storeSession({ expiresIn: -60 })

    const accessTokens = await Promise.all(Array.from({ length: 10 }, () => cognitoTokens.currentAccessToken()))

    expect(accessTokens).toEqual(Array.from({ length: 10 }, () => RENEWED_ACCESS_TOKEN))
    expect(calls.map((call) => call.operation)).toEqual(['InitiateAuth'])
    expect(calls[0]?.body).toMatchObject({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: 'stored-refresh-token' },
    })
    expect(localStorage.getItem(`${PREFIX}.${USERNAME}.accessToken`)).toBe(RENEWED_ACCESS_TOKEN)
  })

  it('has no token when Cognito rejects the renewal, and keeps nothing stored', async () => {
    // The SDK retries every failure for a few seconds before giving up.
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    cognito(() => cognitoError(400, 'NotAuthorizedException'))
    storeSession({ expiresIn: -60 })

    const accessToken = cognitoTokens.currentAccessToken()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(await accessToken).toBeNull()
    expect(storedKeys()).toEqual([])
  })

  it('reports Cognito unreachable while renewing, and keeps the tokens', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    cognito(() => HttpResponse.error())
    storeSession({ expiresIn: -60 })

    const accessToken = cognitoTokens.currentAccessToken()
    const settled = accessToken.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(10_000)

    expect(await settled).toBeInstanceOf(TokensUnreachable)
    expect(cognitoTokens.hasStored()).toBe(true)
  })

  it('forgets by clearing storage and revoking the refresh token', async () => {
    const calls = cognito(() => HttpResponse.json({}))
    storeSession({ expiresIn: 3600 })

    await cognitoTokens.forget()

    expect(storedKeys()).toEqual([])
    expect(calls).toEqual([
      { operation: 'RevokeToken', body: { Token: 'stored-refresh-token', ClientId: 'test-client-id' } },
    ])
  })

  it('forgets locally even when the revocation fails', async () => {
    cognito(() => HttpResponse.error())
    storeSession({ expiresIn: 3600 })

    await cognitoTokens.forget()

    expect(storedKeys()).toEqual([])
  })

  it('tells when another tab forgets the tokens', () => {
    const listener = vi.fn<() => void>()
    const stop = cognitoTokens.onForgottenElsewhere(listener)

    window.dispatchEvent(
      new StorageEvent('storage', { key: `${PREFIX}.LastAuthUser`, newValue: null, storageArea: localStorage }),
    )
    stop()
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
