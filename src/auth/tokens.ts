/*
 * Who holds the tokens that prove this browser signed in. The session never sees a token:
 * it asks for one per request, so a renewal is invisible to everything but this module.
 */
export interface Tokens {
  /** Whether this browser kept tokens from an earlier visit, worth trying to restore. */
  hasStored(): boolean
  /**
   * A valid access token, renewed first if it expired. `null` means there is no session to
   * renew (none stored, or the identity provider rejected the renewal). Rejects with
   * `TokensUnreachable` when the identity provider could not be asked.
   */
  currentAccessToken(): Promise<string | null>
  /** Clears the stored tokens at once, then revokes them; a failed revocation is ignored. */
  forget(): Promise<void>
  /** Calls `listener` when another tab of this browser forgets the tokens. */
  onForgottenElsewhere(listener: () => void): () => void
}

export class TokensUnreachable extends Error {
  constructor(cause: unknown) {
    super('The identity provider could not be reached', { cause })
    this.name = 'TokensUnreachable'
  }
}
