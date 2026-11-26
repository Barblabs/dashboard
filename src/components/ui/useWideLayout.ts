import { useCallback, useSyncExternalStore } from 'react'

export function useWideLayout(minWidth = 1024) {
  const query = `(min-width: ${minWidth}px)`
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', onChange)
      return () => list?.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? true)
}
