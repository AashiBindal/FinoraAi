// JSON HTTP client for the Finora Spring Boot backend.
//
// - Adds "Authorization: Bearer <jwt>" when logged in
// - Converts camelCase ⇄ snake_case (the backend uses Jackson SNAKE_CASE)
// - Turns Spring error bodies ({ message, field_errors }) into HttpError
// - 401 → clears the session (the app then shows the login page)

import { authStore } from './authStore'
import { API_BASE_URL } from './config'

export interface FieldError {
  field: string
  message: string
}

export class HttpError extends Error {
  status: number
  fieldErrors: FieldError[]
  constructor(message: string, status: number, fieldErrors: FieldError[] = []) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** Recursively rename object keys (values are left untouched). */
export function convertKeys(value: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, fn))
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [fn(k), convertKeys(v, fn)]))
  }
  return value
}

export interface HttpOptions extends Omit<RequestInit, 'body'> {
  /** Plain object - serialised as snake_case JSON */
  body?: unknown
  /** Skip the bearer token (login/register) */
  anonymous?: boolean
}

export async function http<T>(path: string, opts: HttpOptions = {}): Promise<T> {
  const { body, anonymous, headers, ...init } = opts
  const token = anonymous ? null : authStore.token()
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(convertKeys(body, toSnake)) : undefined,
    })
  } catch {
    throw new HttpError('Cannot reach the Finora server. Check that the backend is running.', 0)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !anonymous) authStore.clear()
    const err = (json ?? {}) as { message?: string; error?: string | { message?: string }; field_errors?: FieldError[] }
    const fieldErrors = Array.isArray(err.field_errors) ? err.field_errors.map((f) => ({ field: toCamel(f.field), message: f.message })) : []
    const fallback =
      res.status === 401
        ? 'Your session has ended. Please log in again.'
        : res.status === 403
          ? 'You don’t have access to this.'
          : res.status >= 500
            ? 'The server had a problem. Please try again.'
            : `Request failed (${res.status})`
    const nested = typeof err.error === 'object' ? err.error?.message : undefined
    let message = err.message || nested || fallback
    if (fieldErrors.length) message = `${message}: ${fieldErrors.map((f) => f.message).join('; ')}`
    throw new HttpError(message, res.status, fieldErrors)
  }
  return convertKeys(json, toCamel) as T
}
