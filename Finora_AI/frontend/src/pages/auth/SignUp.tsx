import { useState } from 'react'
import { AuthCheckbox, AuthErrorNotice, AuthInput, AUTH_DEMO_DELAY_MS, DemoOnlyNotice, PasswordInput, SubmitButton } from '../../components/auth/AuthFields'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Icon } from '../../components/ui'
import { useAuthForm } from '../../hooks/useAuthForm'
import { Link, useRouter } from '../../lib/router'
import { authService } from '../../services/authService'
import { AUTH_REQUIRED } from '../../services/config'
import { validateEmail, validateName, validateNewPassword } from '../../utils/validation'

export default function SignUp() {
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const { navigate } = useRouter()
  const form = useAuthForm({
    initial: { name: '', email: '', password: '', confirm: '', terms: false as boolean },
    validate: (v) => ({
      name: validateName(v.name),
      email: validateEmail(v.email),
      password: validateNewPassword(v.password),
      confirm: !v.confirm ? 'Please confirm your password.' : v.confirm !== v.password ? 'Passwords don’t match.' : undefined,
      terms: v.terms ? undefined : 'Please accept the Terms and Privacy Policy to continue.',
    }),
    delayMs: AUTH_REQUIRED ? 0 : AUTH_DEMO_DELAY_MS,
    onValid: async (v) => {
      if (!AUTH_REQUIRED) {
        setSubmittedName(v.name.trim().split(/\s+/)[0])
        // Clear passwords from memory after the demo submit
        form.reset({ name: v.name, email: v.email, terms: v.terms })
        return
      }
      setServerError(null)
      try {
        await authService.register(v.name, v.email, v.password)
        // New account: start with the money profile so the dashboard has numbers to work with
        navigate('/profile', { replace: true })
      } catch (e) {
        setServerError(e instanceof Error ? e.message : 'Sign-up failed. Please try again.')
        form.reset({ name: v.name, email: v.email, terms: v.terms })
      }
    },
  })
  const { values, errors, set, blur } = form

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building a clear picture of your money in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent transition-colors hover:text-fg">
            Log in
          </Link>
        </>
      }
    >
      {serverError && <AuthErrorNotice message={serverError} onDismiss={() => setServerError(null)} />}
      {submittedName && (
        <DemoOnlyNotice title={`Thanks, ${submittedName} - this is a demo`} onDismiss={() => setSubmittedName(null)}>
          Your details passed validation, but <b className="font-medium text-fg">no account was created</b> and nothing was saved. Sign-up will work once the backend is connected.
          <Link to="/" className="mt-2 flex w-fit items-center gap-1 font-medium text-accent hover:underline">
            Explore the demo dashboard <Icon name="arrowRight" size={13} />
          </Link>
        </DemoOnlyNotice>
      )}

      <form ref={form.formRef} onSubmit={form.handleSubmit} noValidate className="space-y-5">
        <AuthInput label="Full name" icon="user" autoComplete="name" placeholder="e.g. Aarav Sharma" autoFocus maxLength={80} value={values.name} onChange={set('name')} onBlur={blur('name')} error={errors.name} />
        <AuthInput label="Email address" icon="mail" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={set('email')} onBlur={blur('email')} error={errors.email} />
        <PasswordInput label="Password" placeholder="Create a password" autoComplete="new-password" showStrength value={values.password} onChange={set('password')} onBlur={blur('password')} error={errors.password} />
        <PasswordInput label="Confirm password" placeholder="Re-enter your password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} onBlur={blur('confirm')} error={errors.confirm} />
        {!errors.confirm && values.confirm && values.confirm === values.password && (
          <p className="fade-in -mt-3 flex items-center gap-1.5 text-xs text-ok">
            <Icon name="check" size={12} strokeWidth={3} /> Passwords match
          </p>
        )}
        <AuthCheckbox checked={values.terms} onChange={set('terms')} error={errors.terms}>
          I agree to the{' '}
          <a href="#terms" onClick={(e) => e.preventDefault()} className="text-accent hover:underline">
            Terms and Conditions
          </a>{' '}
          and{' '}
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-accent hover:underline">
            Privacy Policy
          </a>
          , and understand Finora provides financial education, not investment advice.
        </AuthCheckbox>
        <SubmitButton loading={form.loading} loadingText={AUTH_REQUIRED ? 'Creating your account…' : 'Checking details…'}>
          Create account <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
