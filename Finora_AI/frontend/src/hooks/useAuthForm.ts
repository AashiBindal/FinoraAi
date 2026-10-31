// Tiny form helper for the auth pages: values, validation, "touched" tracking,
// a submit with a loading state, and focus on the first invalid field.
// Authentication itself happens in `onValid` (services/authService.ts with the
// backend; a labelled demo notice in local mode).

import { useRef, useState, type FormEvent } from 'react'

type Errors<T> = Partial<Record<keyof T, string>>

export function useAuthForm<T extends Record<string, string | boolean>>(opts: {
  initial: T
  validate: (values: T) => Errors<T>
  /** Called after validation passes (and the optional demo delay). May be async: the button shows loading until it settles. */
  onValid: (values: T) => void | Promise<void>
  /** Simulated delay for demo mode; 0 = none */
  delayMs?: number
}) {
  const [values, setValues] = useState<T>(opts.initial)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const allErrors = opts.validate(values)
  // Show an error once the field was left or the form was submitted
  const errors: Errors<T> = {}
  for (const key of Object.keys(allErrors) as (keyof T)[]) {
    if (submitted || touched[key]) errors[key] = allErrors[key]
  }

  const set = <K extends keyof T>(key: K) => (value: T[K]) => setValues((v) => ({ ...v, [key]: value }))
  // Validate on blur only if the user typed something. Leaving an empty field
  // (e.g. clicking "Sign up" while the auto-focused email is blank) must not
  // pop up a "required" error - that shifts the layout mid-click and swallows
  // the click. Required-field errors appear on submit instead.
  const blur = (key: keyof T) => () => {
    const v = values[key]
    if (typeof v === 'string' && v.trim() === '') return
    setTouched((t) => ({ ...t, [key]: true }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setSubmitted(true)
    if (Object.values(allErrors).some(Boolean)) {
      // Move focus to the first invalid field after the errors render
      setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    setLoading(true)
    try {
      const ms = opts.delayMs ?? 900
      if (ms > 0) await new Promise((r) => setTimeout(r, ms))
      await opts.onValid(values)
    } finally {
      setLoading(false)
    }
  }

  const reset = (next: Partial<T> = {}) => {
    setValues({ ...opts.initial, ...next })
    setTouched({})
    setSubmitted(false)
  }

  return { values, errors, set, blur, loading, handleSubmit, formRef, reset }
}
