import type { Location } from 'react-router'

/*
 * The page a signed-out visitor asked for travels to /login in the navigation state, so
 * signing in can return there. It never leaves the history entry, so it cannot be forged
 * through the URL.
 */
interface ReturnToState {
  returnTo: string
}

export function returnToState({ pathname, search, hash }: Location): ReturnToState {
  return { returnTo: `${pathname}${search}${hash}` }
}

export function returnToOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('returnTo' in state)) return null
  const { returnTo } = state
  return typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : null
}
