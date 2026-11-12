/*
 * One mock resource kept in localStorage, so mock mode survives a reload and each test
 * starts clean once setup clears the storage. `load` hands out a copy of the fallback:
 * a handler changing what it loaded cannot change the fixture.
 */
export function localStore<T>(key: string, fallback: T) {
  return {
    load(): T {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : structuredClone(fallback)
    },
    save(value: T) {
      localStorage.setItem(key, JSON.stringify(value))
    },
    clear() {
      localStorage.removeItem(key)
    },
  }
}
