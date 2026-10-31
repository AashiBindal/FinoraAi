import { useState, type ReactNode } from 'react'
import { Link, useRouter } from '../../lib/router'
import { useWorkspace } from '../../lib/workspace'
import { Icon, IconButton, cx } from '../ui'
import { NAV_SECTIONS } from './navigation'

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { path } = useRouter()
  const { project, backendOnline, health } = useWorkspace()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
        <img src="/favicon.svg" alt="" className="size-7" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{project?.name || 'AgentForge'}</div>
          <div className="truncate text-[11px] text-faint">{project?.hackathon_name || 'Hackathon workspace'}</div>
        </div>
      </div>
      <Link to="/" onClick={onNavigate} className="mx-2.5 mb-5 flex items-center gap-2 rounded-md border border-line px-2.5 py-2 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg">
        <Icon name="chevronLeft" size={13} /> Back to Finora AI
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-faint">{section.title}</div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = path === item.path
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      className={cx(
                        'flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors',
                        active ? 'bg-hover font-medium text-fg' : 'text-muted hover:bg-hover/60 hover:text-fg',
                      )}
                    >
                      <Icon name={item.icon} size={15} className={active ? 'text-accent' : ''} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-2.5 rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-muted">Backend</span>
          <span className="flex items-center gap-1.5">
            <span
              className={cx(
                'size-1.5 rounded-full',
                backendOnline === null ? 'bg-faint' : backendOnline ? 'bg-ok' : 'bg-danger',
              )}
            />
            <span className={backendOnline === false ? 'text-danger' : 'text-fg'}>
              {backendOnline === null ? 'Checking' : backendOnline ? 'Online' : 'Offline'}
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-muted">AI model</span>
          <span className={health?.ai_provider_configured ? 'text-ok' : 'text-faint'}>
            {health ? (health.ai_provider_configured ? 'Connected' : 'Not configured') : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function OfflineBanner() {
  const { backendOnline } = useWorkspace()
  if (backendOnline !== false) return null
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm">
      <Icon name="alert" className="mt-0.5 text-danger" />
      <div>
        <div className="font-medium text-fg">Backend is not reachable</div>
        <div className="mt-0.5 text-muted">
          Start it in another terminal:{' '}
          <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-xs text-fg">
            cd workspace-api &amp;&amp; uvicorn app.main:app --reload
          </code>
        </div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-panel/60 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur lg:hidden">
        <IconButton icon="menu" label="Open navigation" onClick={() => setMobileOpen(true)} />
        <span className="text-sm font-semibold">AgentForge</span>
      </header>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-64 border-r border-line bg-panel" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:py-10">
          <OfflineBanner />
          {children}
        </div>
      </main>
    </div>
  )
}
