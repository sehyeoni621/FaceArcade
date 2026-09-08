import { useSyncExternalStore } from 'react'

/**
 * Minimal persisted store: a value in localStorage, a listener set, and a
 * `useSyncExternalStore` hook. Used for settings and score records.
 *
 * localStorage can throw (private mode, disabled site data), so every access
 * is guarded and the in-memory value is the source of truth.
 */
export interface PersistedStore<T> {
  get(): T
  set(next: T | ((current: T) => T)): void
  subscribe(listener: () => void): () => void
  /** React hook returning the current value. */
  use(): T
}

export function createPersistedStore<T>(
  key: string,
  defaultValue: T,
  /** Repairs a value read back from storage (older shape, missing keys). */
  migrate: (raw: unknown) => T = (raw) => ({ ...defaultValue, ...(raw as Partial<T>) }),
): PersistedStore<T> {
  let value: T = defaultValue
  const listeners = new Set<() => void>()

  try {
    const raw = localStorage.getItem(key)
    if (raw) value = migrate(JSON.parse(raw))
  } catch {
    value = defaultValue
  }

  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage unavailable: keep going in memory only.
    }
  }

  const get = () => value
  const set: PersistedStore<T>['set'] = (next) => {
    const resolved = typeof next === 'function' ? (next as (current: T) => T)(value) : next
    if (Object.is(resolved, value)) return
    value = resolved
    persist()
    listeners.forEach((listener) => listener())
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    get,
    set,
    subscribe,
    use: () => useSyncExternalStore(subscribe, get, get),
  }
}
