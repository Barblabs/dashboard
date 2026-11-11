/*
 * Wraps `run` so calls made while one is under way share its promise instead of starting
 * another; the next call after it settles starts afresh.
 */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null
  return () => {
    pending ??= run().finally(() => {
      pending = null
    })
    return pending
  }
}
