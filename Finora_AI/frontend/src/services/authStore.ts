// Session storage for the JWT issued by the Spring backend.
//
// "Remember me" → localStorage (survives restarts); otherwise sessionStorage
// (cleared when the tab closes). The token is a bearer token, so it is only
// ever sent in the Authorization header to our own API.
// Note: any script running on the page can read web storage. An httpOnly cookie
// would be safer but needs backend changes (see README → "Security notes").

export interface AuthUser {
  userId: number
  email: string
  fullName: string
  currency: string
}

export interface AuthSession {
  token: string
  user: AuthUser
  /** Epoch ms from the JWT "exp" claim (0 when unknown) */
  expiresAt: number
}

const KEY = 'finora:auth'
type Listener = (s: AuthSession | null) => void
const listeners = new Set<Listener>()

function read(store: Storage | undefined): AuthSession | null {
  try {
    const raw = store?.getItem(KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

const safe = (fn: () => void) => {
  try {
    fn()
  } catch {
    /* storage blocked - session stays in memory only */
  }
}

let memory: AuthSession | null = null

/** Decode the "exp" claim of a JWT (no signature check - the server does that). */
export function jwtExpiry(token: string): number {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' ? json.exp * 1000 : 0
  } catch {
    return 0
  }
}

const isExpired = (s: AuthSession) => s.expiresAt > 0 && Date.now() >= s.expiresAt

export const authStore = {
  get(): AuthSession | null {
    const s = memory ?? read(globalThis.sessionStorage) ?? read(globalThis.localStorage)
    if (s && isExpired(s)) {
      authStore.clear()
      return null
    }
    memory = s
    return s
  },
  token(): string | null {
    return authStore.get()?.token ?? null
  },
  set(session: AuthSession, remember: boolean) {
    memory = session
    safe(() => {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
      ;(remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session))
    })
    listeners.forEach((l) => l(session))
  },
  /** Update the stored user (e.g. after a name change), keeping the remember-me choice. */
  updateUser(user: Partial<AuthUser>) {
    const s = authStore.get()
    if (!s) return
    let remember = false
    safe(() => {
      remember = localStorage.getItem(KEY) !== null
    })
    authStore.set({ ...s, user: { ...s.user, ...user } }, remember)
  },
  clear() {
    const had = memory !== null || read(globalThis.sessionStorage) !== null || read(globalThis.localStorage) !== null
    memory = null
    safe(() => {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
    })
    if (had) listeners.forEach((l) => l(null))
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}
