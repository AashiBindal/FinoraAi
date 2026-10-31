import { useEffect, useState } from 'react'
import { authStore, type AuthSession } from '../services/authStore'

/** Current session (null when logged out). Re-renders on login, logout and 401s. */
export function useAuthSession(): AuthSession | null {
  const [session, setSession] = useState<AuthSession | null>(() => authStore.get())
  useEffect(() => authStore.subscribe(setSession), [])
  return session
}
