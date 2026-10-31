import { useState } from 'react'
import { AuthCheckbox, AuthErrorNotice, AuthInput, AUTH_DEMO_DELAY_MS, DemoOnlyNotice, PasswordInput, SubmitButton } from '../../components/auth/AuthFields'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Icon } from '../../components/ui'
import { useAuthForm } from '../../hooks/useAuthForm'
import { Link, useQueryParam, useRouter } from '../../lib/router'
import { authService, safeNextPath } from '../../services/authService'
import { AUTH_REQUIRED } from '../../services/config'
import { validateEmail, validateRequired } from '../../utils/validation'

export default function Login() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const { navigate } = useRouter()
  const next = safeNextPath(useQueryParam('next'))
  const form = useAuthForm({
    initial: { email: '', password: '', remember: false as boolean },
    validate: (v) => ({ email: validateEmail(v.email), password: validateRequired(v.password, 'Password') }),
    delayMs: AUTH_REQUIRED ? 0 : AUTH_DEMO_DELAY_MS,
    onValid: async (v) => {
      if (!AUTH_REQUIRED) {
        // Local demo mode: there is no backend to authenticate against
        setSubmittedEmail(v.email.trim())
        form.reset({ email: v.email, remember: v.remember })
        return
      }
      setServerError(null)
      try {
        await authService.login(v.email, v.password, v.remember)
        navigate(next, { replace: true })
      } catch (e) {
        setServerError(e instanceof Error ? e.message : 'Login failed. Please try again.')
        form.reset({ email: v.email, remember: v.remember })
      }
    },
  })
  const { values, errors, set, blur } = form

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your money, goals and coach insights."
      footer={
        <>
          New to Finora?{' '}
          <Link to="/signup" className="font-medium text-accent transition-colors hover:text-fg">
            Create an account
          </Link>
        </>
      }
    >
      {serverError && <AuthErrorNotice message={serverError} onDismiss={() => setServerError(null)} />}
      {submittedEmail && (
        <DemoOnlyNotice title="Login isn’t connected yet" onDismiss={() => setSubmittedEmail(null)}>
          Your details passed validation, but you were <b className="font-medium text-fg">not signed in</b> - authentication will be added with the backend. You can keep exploring Finora with sample data.
          <Link to="/" className="mt-2 flex w-fit items-center gap-1 font-medium text-accent hover:underline">
            Explore the demo dashboard <Icon name="arrowRight" size={13} />
          </Link>
        </DemoOnlyNotice>
      )}

      <form ref={form.formRef} onSubmit={form.handleSubmit} noValidate className="space-y-5">
        <AuthInput label="Email address" icon="mail" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" autoFocus value={values.email} onChange={set('email')} onBlur={blur('email')} error={errors.email} />
        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={values.password}
          onChange={set('password')}
          onBlur={blur('password')}
          error={errors.password}
          labelAction={
            <Link to="/forgot-password" className="text-xs font-medium text-accent transition-colors hover:text-fg">
              Forgot password?
            </Link>
          }
        />
        <AuthCheckbox checked={values.remember} onChange={set('remember')}>
          Remember me on this device
        </AuthCheckbox>
        <SubmitButton loading={form.loading} loadingText={AUTH_REQUIRED ? 'Logging in…' : 'Checking details…'}>
          <Icon name="logIn" size={16} /> Log in
        </SubmitButton>
      </form>

      <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <Icon name="lock" size={12} className="mt-0.5 shrink-0" />
        {AUTH_REQUIRED
          ? 'Your password is sent only to the Finora server over this connection and is never stored in the browser.'
          : 'Demo build: nothing you type here is sent anywhere or stored.'}
      </p>
    </AuthLayout>
  )
}
