// Authentication against the Finora Spring Boot backend.
//   POST /api/auth/register  { full_name, email, password } → AuthResponse
//   POST /api/auth/login     { email, password }            → AuthResponse
// AuthResponse: { token, token_type, user_id, email, full_name, currency }
//
// Not available on the backend (shown honestly in the UI):
//   - forgot / reset password (no endpoint, no email service)
//   - social login (/api/auth/oauth2/callback is disabled until ID tokens are verified)
//   - server-side logout (JWTs are stateless: logout clears the token in this browser)

import { authStore, jwtExpiry, type AuthSession } from './authStore'
import { http } from './http'

interface AuthResponseDto {
  token: string
  tokenType?: string
  userId: number
  email: string
  fullName: string
  currency?: string
}

function toSession(r: AuthResponseDto): AuthSession {
  return {
    token: r.token,
    expiresAt: jwtExpiry(r.token),
    user: { userId: r.userId, email: r.email, fullName: r.fullName, currency: r.currency ?? 'INR' },
  }
}

export const authService = {
  async login(email: string, password: string, remember: boolean): Promise<AuthSession> {
    const r = await http<AuthResponseDto>('/api/auth/login', { method: 'POST', anonymous: true, body: { email: email.trim(), password } })
    const session = toSession(r)
    authStore.set(session, remember)
    return session
  },
  async register(fullName: string, email: string, password: string): Promise<AuthSession> {
    const r = await http<AuthResponseDto>('/api/auth/register', { method: 'POST', anonymous: true, body: { fullName: fullName.trim(), email: email.trim(), password } })
    const session = toSession(r)
    // New accounts are not "remembered" by default; the user can tick it on the next login.
    authStore.set(session, false)
    return session
  },
  logout() {
    authStore.clear()
  },
  session: () => authStore.get(),
}

/** Only allow in-app redirects ("/goals"), never "//evil.com", "/\\evil.com" or absolute URLs. */
export const safeNextPath = (next: string | null): string =>
  next && /^\/(?![\/\\])/.test(next) && !next.startsWith('/login') ? next : '/'
