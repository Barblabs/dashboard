import { useSyncExternalStore } from 'react'

const WIDE = '(min-width: 768px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(WIDE)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

function isWide() {
  return window.matchMedia?.(WIDE).matches ?? true
}

export function useWideLayout() {
  return useSyncExternalStore(subscribe, isWide)
}
