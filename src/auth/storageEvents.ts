/*
 * Calls `listener` when another tab removes `key` from localStorage, or clears it.
 * The browser only fires `storage` in the tabs that did not make the change.
 */
export function onStorageKeyRemoved(key: string, listener: () => void): () => void {
  function handle(event: StorageEvent) {
    if (event.storageArea !== localStorage) return
    if (event.key === null || (event.key === key && event.newValue === null)) listener()
  }
  window.addEventListener('storage', handle)
  return () => window.removeEventListener('storage', handle)
}
