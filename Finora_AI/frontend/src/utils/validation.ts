// Form validation helpers shared by the auth pages (and reusable elsewhere).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string): string | undefined {
  const v = value.trim()
  if (!v) return 'Email address is required.'
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Enter a valid email address, e.g. name@example.com.'
}

export function validateRequired(value: string, label: string): string | undefined {
  if (!value.trim()) return `${label} is required.`
}

export function validateName(value: string): string | undefined {
  const v = value.trim()
  if (!v) return 'Full name is required.'
  if (v.length < 2) return 'Name must be at least 2 characters.'
  if (v.length > 80) return 'Name must be under 80 characters.'
  if (!/^[\p{L}\s.'-]+$/u.test(v)) return 'Use letters, spaces, apostrophes or hyphens only.'
}

export interface PasswordCheck {
  label: string
  ok: boolean
}

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'Upper & lower case letters', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: 'At least one number', ok: /\d/.test(pw) },
    { label: 'At least one symbol', ok: /[^A-Za-z0-9]/.test(pw) },
  ]
}

/** 0-4 strength score from the checks above */
export function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' }
  const score = passwordChecks(pw).filter((c) => c.ok).length
  return { score, label: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score] }
}

/** Sign-up password rule: 8+ chars with a letter and a number (the meter encourages more). */
export function validateNewPassword(pw: string): string | undefined {
  if (!pw) return 'Password is required.'
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (pw.length > 128) return 'Password must be under 128 characters.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.'
}
