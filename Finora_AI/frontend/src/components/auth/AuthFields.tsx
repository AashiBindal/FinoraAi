// Accessible form fields for the auth pages: label, leading icon,
// inline error (aria-invalid + aria-describedby) and a password toggle.

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { passwordChecks, passwordStrength } from '../../utils/validation'
import { Icon, Spinner, cx, type IconName } from '../ui'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string
  icon: IconName
  value: string
  onChange: (value: string) => void
  error?: string
  /** Extra element on the right of the label row (e.g. "Forgot password?") */
  labelAction?: ReactNode
}

export function AuthInput({ label, icon, value, onChange, error, labelAction, className, type = 'text', ...rest }: InputProps) {
  const id = useId()
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        {labelAction}
      </div>
      <InputShell icon={icon} error={error}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx('h-11 w-full bg-transparent pr-3 pl-10 text-sm text-fg placeholder:text-faint focus:outline-none', className)}
          {...rest}
        />
      </InputShell>
      <FieldMessage id={`${id}-error`} error={error} />
    </div>
  )
}

export function PasswordInput({ label, value, onChange, error, labelAction, showStrength, autoComplete = 'current-password', ...rest }: Omit<InputProps, 'icon'> & { showStrength?: boolean }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const strength = passwordStrength(value)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        {labelAction}
      </div>
      <InputShell icon="lock" error={error}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : showStrength ? `${id}-strength` : undefined}
          className="h-11 w-full bg-transparent pr-11 pl-10 text-sm text-fg placeholder:text-faint focus:outline-none"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-fg"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={16} />
        </button>
      </InputShell>
      <FieldMessage id={`${id}-error`} error={error} />

      {showStrength && value && (
        <div id={`${id}-strength`} className="fade-in mt-2.5" aria-live="polite">
          <div className="flex items-center gap-2">
            <div className="grid flex-1 grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cx(
                    'h-1 rounded-full transition-colors',
                    i <= strength.score ? (strength.score <= 1 ? 'bg-danger' : strength.score === 2 ? 'bg-warn' : strength.score === 3 ? 'bg-accent' : 'bg-ok') : 'bg-hover',
                  )}
                />
              ))}
            </div>
            <span className="w-16 text-right text-[11px] text-muted">{strength.label}</span>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {passwordChecks(value).map((c) => (
              <li key={c.label} className={cx('flex items-center gap-1.5 text-[11px] transition-colors', c.ok ? 'text-ok' : 'text-faint')}>
                <Icon name={c.ok ? 'check' : 'circle'} size={11} strokeWidth={c.ok ? 3 : 2} />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InputShell({ icon, error, children }: { icon: IconName; error?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'group relative rounded-lg border bg-panel-2 transition-[border-color,box-shadow]',
        error ? 'border-danger/60 focus-within:ring-2 focus-within:ring-danger/25' : 'border-line hover:border-line-strong focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20',
      )}
    >
      <Icon name={icon} size={16} className={cx('pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors', error ? 'text-danger' : 'text-faint group-focus-within:text-accent')} />
      {children}
    </div>
  )
}

function FieldMessage({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={id} role="alert" className="fade-in mt-1.5 flex items-center gap-1.5 text-xs text-danger">
      <Icon name="alert" size={12} /> {error}
    </p>
  )
}

export function AuthCheckbox({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm text-muted select-none">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} className="mt-0.5 size-4 shrink-0 cursor-pointer rounded" />
        <span>{children}</span>
      </label>
      <FieldMessage id={`${id}-error`} error={error} />
    </div>
  )
}

export function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: ReactNode; loadingText: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-on-accent shadow-lg shadow-accent/15 transition-all hover:-translate-y-px hover:shadow-accent/25 hover:brightness-110 active:translate-y-0 disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0"
    >
      {loading ? (
        <>
          <Spinner size={16} /> {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

/** Shown after a successful client-side validation. Makes clear nothing was authenticated. */
export function DemoOnlyNotice({ title, children, onDismiss }: { title: string; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div role="status" aria-live="polite" className="fade-in mb-6 rounded-xl border border-warn/30 bg-warn-soft/60 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warn/15 text-warn">
          <Icon name="info" size={16} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg">{title}</span>
            <span className="rounded-full bg-warn/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-warn uppercase">Demo only</span>
          </div>
          <div className="mt-1 leading-relaxed text-muted">{children}</div>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-6 place-items-center rounded text-faint hover:bg-hover hover:text-fg">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

/** Server error shown above an auth form (wrong password, email already registered, server down…). */
export function AuthErrorNotice({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div role="alert" className="fade-in mb-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft/50 p-4 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-danger/15 text-danger">
        <Icon name="alert" size={16} />
      </span>
      <p className="min-w-0 flex-1 pt-1 leading-relaxed text-fg">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-6 place-items-center rounded text-faint hover:bg-hover hover:text-fg">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  )
}

export const AUTH_DEMO_DELAY_MS = 900
