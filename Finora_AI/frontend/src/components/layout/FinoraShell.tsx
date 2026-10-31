import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAuthSession } from '../../hooks/useAuth'
import { useFinance } from '../../hooks/useFinance'
import { COACH_MODE, DATA_SOURCE } from '../../services'
import { authService } from '../../services/authService'
import { formatDate, monthLabel } from '../../utils/dates'
import { Link, useRouter } from '../../lib/router'
import { SampleBadge, Skeleton } from '../common'
import { Button, Icon, IconButton, cx } from '../ui'
import { FINORA_NAV, FINORA_SETTINGS, pageTitle, type FinoraNavItem } from './finoraNav'

export function FinoraLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#12302d" />
      <path d="M10 23V9h11M10 16h7" fill="none" stroke="#2dd4bf" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 23l3.5-3.5L24 21.5" fill="none" stroke="#a397f5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'U'

function NavLink({ item, active, count, onNavigate }: { item: FinoraNavItem; active: boolean; count?: number; onNavigate?: () => void }) {
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] transition-colors',
        active ? 'bg-hover font-medium text-fg' : 'text-muted hover:bg-hover/60 hover:text-fg',
      )}
    >
      {active && <span className="absolute top-2 bottom-2 -left-2.5 w-[3px] rounded-r bg-accent" />}
      <Icon name={item.icon} size={16} className={active ? 'text-accent' : 'text-faint group-hover:text-muted'} />
      <span className="flex-1">{item.label}</span>
      {!!count && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-on-accent">{count}</span>}
    </Link>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { path } = useRouter()
  const { data, unreadAlerts } = useFinance()
  const session = useAuthSession()
  const { navigate } = useRouter()
  const name = data?.profile.name || 'Your profile'
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-5 pb-7">
        <FinoraLogo />
        <div>
          <div className="text-[15px] leading-tight font-semibold tracking-tight">
            Finora <span className="text-accent">AI</span>
          </div>
          <div className="text-[11px] text-faint">Personal finance coach</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-5" aria-label="Main">
        {FINORA_NAV.map((section) => (
          <div key={section.title}>
            <div className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">{section.title}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.path} item={item} active={path === item.path} count={item.badge === 'alerts' ? unreadAlerts : undefined} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-0.5 border-t border-line pt-4">
          <NavLink item={FINORA_SETTINGS} active={path === FINORA_SETTINGS.path} onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="m-3 rounded-xl border border-line bg-panel-2 p-3">
        <Link to="/profile" onClick={onNavigate} className="flex items-center gap-3 rounded-lg transition-colors hover:text-fg">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-soft text-xs font-semibold text-violet">{initials(name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-[11px] text-faint">{data?.profile.email || 'Set up your money profile'}</span>
          </span>
          <Icon name="chevronRight" size={14} className="text-faint" />
        </Link>
        <div className="mt-3 flex gap-1.5 border-t border-line pt-2.5">
          {session ? (
            <button
              type="button"
              onClick={() => {
                onNavigate?.()
                authService.logout()
                navigate('/login', { replace: true })
              }}
              className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-line text-[11px] text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <Icon name="logOut" size={12} /> Log out
            </button>
          ) : (
            <>
              <Link to="/login" onClick={onNavigate} className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-line text-[11px] text-muted transition-colors hover:border-line-strong hover:text-fg">
                <Icon name="logIn" size={12} /> Log in
              </Link>
              <Link to="/signup" onClick={onNavigate} className="flex h-7 flex-1 items-center justify-center rounded-md bg-accent-soft text-[11px] font-medium text-accent transition-colors hover:bg-accent/20">
                Sign up
              </Link>
            </>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-faint">
          <span className={cx('size-1.5 rounded-full', DATA_SOURCE === 'api' ? 'bg-ok' : 'bg-warn')} />
          {DATA_SOURCE === 'api' ? 'Synced with backend' : 'Saved in this browser'} · Coach: {COACH_MODE === 'api' ? 'server AI' : 'demo'}
        </div>
      </div>
    </div>
  )
}

function NotificationsMenu() {
  const { alerts, unreadAlerts, setAlertsRead } = useFinance()
  const { navigate } = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const latest = alerts.filter((a) => !a.read).slice(0, 5)
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadAlerts ? `, ${unreadAlerts} unread` : ''}`}
        className="relative grid size-9 place-items-center rounded-lg border border-line bg-panel-2 text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <Icon name="bell" size={16} />
        {unreadAlerts > 0 && <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-on-accent">{unreadAlerts}</span>}
      </button>
      {open && (
        <div className="fade-in absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line-strong bg-panel shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {latest.length > 0 && (
              <button className="text-xs text-accent hover:underline" onClick={() => setAlertsRead(alerts.map((a) => a.id), true)}>
                Mark all read
              </button>
            )}
          </div>
          {latest.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">You're all caught up.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {latest.map((a) => (
                <li key={a.id}>
                  <button
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-panel-2"
                    onClick={() => {
                      void setAlertsRead([a.id], true)
                      setOpen(false)
                      navigate('/alerts')
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className={cx('size-1.5 shrink-0 rounded-full', a.severity === 'high' ? 'bg-danger' : a.severity === 'medium' ? 'bg-warn' : 'bg-info')} />
                      <span className="truncate font-medium">{a.title}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 pl-3.5 text-xs text-muted">{a.description}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-xs text-muted hover:text-fg">
            View all alerts
          </Link>
        </div>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { path, navigate } = useRouter()
  const { month, setMonth, months, hasSampleData, data } = useFinance()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/transactions?q=${encodeURIComponent(q.trim())}`)
  }
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md print:hidden">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <IconButton icon="menu" label="Open navigation" onClick={onMenu} className="lg:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{pageTitle(path)}</h1>
          <p className="hidden text-[11px] text-faint sm:block">
            {monthLabel(month)}
            {data && ` · updated ${formatDate(data.profile.updatedAt.slice(0, 10))}`}
          </p>
        </div>

        <form onSubmit={submit} className="relative hidden md:block" role="search">
          <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transactions…"
            aria-label="Search transactions"
            className="h-9 w-56 rounded-lg border border-line bg-panel-2 pr-3 pl-9 text-sm placeholder:text-faint focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/25 xl:w-72"
          />
        </form>

        {hasSampleData && (
          <Link to="/settings#data" className="hidden sm:block" title="You're viewing sample data. Manage it in Settings.">
            <SampleBadge />
          </Link>
        )}

        <label className="relative">
          <span className="sr-only">Select month</span>
          <Icon name="calendar" size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 cursor-pointer appearance-none rounded-lg border border-line bg-panel-2 pr-7 pl-8 text-sm text-fg hover:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            {[...months].reverse().map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, 'short')}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={13} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-faint" />
        </label>

        <NotificationsMenu />
        <Link to="/profile" aria-label="Your money profile" className="hidden size-9 place-items-center rounded-full bg-violet-soft text-xs font-semibold text-violet ring-1 ring-line sm:grid">
          {initials(data?.profile.name ?? '')}
        </Link>
      </div>
    </header>
  )
}

function ShellState() {
  const { status, error, reload, resetDemoData } = useFinance()
  if (status === 'error')
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-danger/30 bg-danger-soft/30 p-6 text-center">
        <Icon name="alert" size={22} className="mx-auto text-danger" />
        <h2 className="mt-3 font-semibold">Couldn't load your finances</h2>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button icon="refresh" onClick={reload}>
            Retry
          </Button>
          {DATA_SOURCE === 'local' && (
            <Button variant="ghost" onClick={resetDemoData}>
              Reset demo data
            </Button>
          )}
        </div>
      </div>
    )
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

export function FinoraShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { status } = useFinance()
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-panel/70 lg:block print:hidden">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="fade-in h-full w-72 border-r border-line bg-panel" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-64 print:pl-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{status === 'ready' ? children : <ShellState />}</main>
      </div>
    </div>
  )
}
