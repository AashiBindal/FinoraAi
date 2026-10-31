import { useEffect, useState } from 'react'
import { AuthInput, AUTH_DEMO_DELAY_MS, DemoOnlyNotice, SubmitButton } from '../../components/auth/AuthFields'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Button, Icon } from '../../components/ui'
import { useAuthForm } from '../../hooks/useAuthForm'
import { Link } from '../../lib/router'
import { validateEmail } from '../../utils/validation'

const RESEND_SECONDS = 30

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const form = useAuthForm({
    initial: { email: '' },
    validate: (v) => ({ email: validateEmail(v.email) }),
    delayMs: AUTH_DEMO_DELAY_MS,
    onValid: (v) => {
      setSentTo(v.email.trim())
      setCooldown(RESEND_SECONDS)
    },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const backToLogin = (
    <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-accent transition-colors hover:text-fg">
      <Icon name="chevronLeft" size={14} /> Back to login
    </Link>
  )

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox" subtitle="Here’s what would happen next." footer={backToLogin}>
        <div className="fade-in">
          <div className="mb-6 flex justify-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-accent/30 bg-accent-soft text-accent">
              <Icon name="mail" size={24} />
            </span>
          </div>
          <p className="text-center text-sm leading-relaxed text-muted">
            If an account exists for <b className="font-medium break-all text-fg">{sentTo}</b>, we’d send a link to reset your password. It would expire after 30 minutes.
          </p>
          <div className="mt-6">
            <DemoOnlyNotice title="No email was sent">
              The Finora backend has no password-reset endpoint or email service yet, so nothing was sent - this screen shows the planned flow.
            </DemoOnlyNotice>
          </div>
          <div className="space-y-2.5">
            <Button
              className="h-11 w-full"
              icon="refresh"
              disabled={cooldown > 0}
              onClick={() => setCooldown(RESEND_SECONDS)}
            >
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend link (demo)'}
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full"
              onClick={() => {
                setSentTo(null)
                form.reset({ email: sentTo })
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter the email you signed up with and we’ll send you a reset link." footer={backToLogin}>
      <form ref={form.formRef} onSubmit={form.handleSubmit} noValidate className="space-y-5">
        <AuthInput
          label="Email address"
          icon="mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
          value={form.values.email}
          onChange={form.set('email')}
          onBlur={form.blur('email')}
          error={form.errors.email}
        />
        <SubmitButton loading={form.loading} loadingText="Sending…">
          <Icon name="send" size={16} /> Send reset link
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-xs text-faint">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Log in instead
        </Link>
      </p>
    </AuthLayout>
  )
}
