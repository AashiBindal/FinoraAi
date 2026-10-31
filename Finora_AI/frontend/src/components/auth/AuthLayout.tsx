// Split-screen layout for Login / Sign up / Forgot password.
// Left: brand panel (laptop+). Right: the form card. Mobile: card only.

import { useEffect, type ReactNode } from 'react'
import { Link } from '../../lib/router'
import { FinoraLogo } from '../layout/FinoraShell'
import { Icon, type IconName } from '../ui'

const HIGHLIGHTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'sparkles', title: 'A coach that knows your numbers', text: 'Ask where your money goes and get answers with the maths shown.' },
  { icon: 'target', title: 'Goals with real timelines', text: 'See exactly when you’ll hit each goal - and what speeds it up.' },
  { icon: 'shield', title: 'Private by design', text: 'No bank logins. You choose what to import and review it first.' },
]

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} · Finora AI`
    return () => {
      document.title = prev
    }
  }, [title])

  return (
    <div className="relative min-h-screen overflow-clip bg-bg">
      {/* Subtle ambient glow - two soft spots, not a full gradient */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-40 size-[480px] rounded-full bg-accent/10 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -bottom-40 size-[480px] rounded-full bg-violet/10 blur-[120px]" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-16 lg:px-8">
        {/* Brand panel */}
        <aside className="hidden flex-col justify-between py-12 lg:flex">
          <Link to="/" className="flex w-fit items-center gap-3">
            <FinoraLogo size={36} />
            <span className="text-lg font-semibold tracking-tight">
              Finora <span className="text-accent">AI</span>
            </span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
              Your Money. Your Goals.
              <br />
              <span className="text-accent">Your Intelligent Financial Coach.</span>
            </h2>
            <ul className="mt-10 space-y-6">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-panel text-accent">
                    <Icon name={h.icon} size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-fg">{h.title}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted">{h.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Illustrative preview card (not real data) */}
            <div className="mt-10 max-w-sm rounded-2xl border border-line bg-panel/80 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Saved this month</span>
                <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] tracking-wide text-faint uppercase">Illustration</span>
              </div>
              <div className="num mt-2 text-2xl font-semibold">₹27,000</div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-hover">
                <div className="h-full w-[41%] rounded-full bg-accent" />
              </div>
              <div className="mt-2 text-[11px] text-faint">41.5% of income · target 35%</div>
            </div>
          </div>

          <p className="text-xs text-faint">© {new Date().getFullYear()} Finora AI · Financial education, not investment advice.</p>
        </aside>

        {/* Form */}
        <main className="flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-0">
          <Link to="/" className="mx-auto mb-8 flex items-center gap-2.5 lg:hidden">
            <FinoraLogo size={34} />
            <span className="text-lg font-semibold tracking-tight">
              Finora <span className="text-accent">AI</span>
            </span>
          </Link>

          <div className="auth-card mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/90 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
            </div>
            {children}
          </div>

          {footer && <div className="mx-auto mt-6 w-full max-w-md text-center text-sm text-muted">{footer}</div>}
        </main>
      </div>
    </div>
  )
}
