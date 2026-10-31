// Safe localStorage wrapper. Storage can be unavailable (private mode, quota,
// blocked site data), so every access is wrapped and falls back gracefully.

import { authStore } from './authStore'
import { AUTH_REQUIRED, LOCAL_LATENCY_MS } from './config'

const PREFIX = 'finora:v1:'

// With the backend, browser-only data (settings, rules, coach history, UI-only
// fields) is kept per signed-in user so two accounts on one browser never mix.
const scoped = (key: string) => {
  if (!AUTH_REQUIRED) return PREFIX + key
  const uid = authStore.get()?.user.userId
  return `${PREFIX}u${uid ?? 'anon'}:${key}`
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(scoped(key))
      return raw == null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T) {
    try {
      localStorage.setItem(scoped(key), JSON.stringify(value))
    } catch {
      /* storage full or blocked - data stays in memory for this session */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(scoped(key))
    } catch {
      /* ignore */
    }
  },
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  },
}

/** Resolve after a short delay so local mode behaves like a network call. */
export const delay = <T>(value: T, ms = LOCAL_LATENCY_MS) => new Promise<T>((r) => setTimeout(() => r(value), ms))

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
