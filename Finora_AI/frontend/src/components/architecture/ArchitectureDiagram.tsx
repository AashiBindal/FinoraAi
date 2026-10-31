// Responsive layered architecture diagram. Layer boxes list the integrations
// documented for that layer, so the diagram updates as the team adds them.

import type { ReactNode } from 'react'
import { INTEGRATION_STATUS } from '../../lib/format'
import type { Integration, Layer } from '../../types'
import { Icon, cx, type IconName } from '../ui'

export const LAYERS: Record<Layer, { title: string; icon: IconName; path: string; parts: string[] }> = {
  frontend: { title: 'Frontend', icon: 'monitor', path: 'frontend/src', parts: ['React + Vite + TS', 'Tailwind design system', 'Typed API client'] },
  backend: { title: 'Backend API', icon: 'server', path: 'workspace-api/app/api', parts: ['FastAPI routes', 'Services (progress, activity)', 'Error handling'] },
  agent: { title: 'AI Agent', icon: 'brain', path: 'workspace-api/app/agents', parts: ['Reasoning loop', 'Memory', 'Prompts', 'LLM providers'] },
  tools: { title: 'Tools & APIs', icon: 'tool', path: 'workspace-api/app/tools', parts: ['Tool registry', 'Built-in tools', 'External API clients'] },
  database: { title: 'Database', icon: 'database', path: 'workspace-api/app/models', parts: ['SQLAlchemy ORM', 'SQLite → PostgreSQL'] },
}

const DOT = { planned: 'bg-faint', in_progress: 'bg-info', connected: 'bg-ok' } as const

function LayerBox({ layer, items, className }: { layer: Layer; items: Integration[]; className?: string }) {
  const meta = LAYERS[layer]
  return (
    <div className={cx('rounded-xl border border-line bg-panel-2 p-4', className)}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-accent-soft text-accent">
          <Icon name={meta.icon} size={14} />
        </span>
        <div>
          <div className="text-sm font-semibold">{meta.title}</div>
          <div className="font-mono text-[10px] text-faint">{meta.path}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {meta.parts.map((p) => (
          <span key={p} className="rounded border border-line bg-panel px-1.5 py-0.5 text-[11px] text-muted">
            {p}
          </span>
        ))}
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-xs" title={INTEGRATION_STATUS[i.status].label}>
              <span className={cx('size-1.5 rounded-full', DOT[i.status])} />
              <span className="truncate text-fg/90">{i.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Arrow({ label, className }: { label: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center py-1.5 text-[11px] text-faint', className)}>
      <span className="h-3 w-px bg-line-strong" />
      <span className="rounded-full border border-line bg-panel px-2 py-0.5 font-mono">{label}</span>
      <span className="h-3 w-px bg-line-strong" />
      <Icon name="chevronDown" size={12} className="-mt-1" />
    </div>
  )
}

export function ArchitectureDiagram({ integrations }: { integrations: Integration[] }) {
  const by = (l: Layer) => integrations.filter((i) => i.layer === l)
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mx-auto max-w-md">
        <div className="mb-1.5 text-center text-[11px] uppercase tracking-wider text-faint">User (browser)</div>
        <LayerBox layer="frontend" items={by('frontend')} />
        <Arrow label="HTTP · /api · JSON" />
        <LayerBox layer="backend" items={by('backend')} />
      </div>
      <Arrow label="services call into" />
      <div className="grid gap-3 md:grid-cols-3">
        <LayerBox layer="agent" items={by('agent')} />
        <LayerBox layer="tools" items={by('tools')} />
        <LayerBox layer="database" items={by('database')} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-center text-[11px] text-muted">
          ↓ LLM APIs (OpenAI-compatible / Anthropic)
        </div>
        <div className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-center text-[11px] text-muted">↓ External APIs (per problem)</div>
        <div className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-center text-[11px] text-muted">↓ SQLite file / PostgreSQL server</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-faint">
        {(['connected', 'in_progress', 'planned'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cx('size-1.5 rounded-full', DOT[s])} /> {INTEGRATION_STATUS[s].label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AgentLoopDiagram() {
  const steps: { label: string; icon: IconName }[] = [
    { label: 'Goal', icon: 'target' },
    { label: 'Reason', icon: 'brain' },
    { label: 'Select tool', icon: 'tool' },
    { label: 'Execute', icon: 'terminal' },
    { label: 'Observe', icon: 'eye' },
    { label: 'Answer', icon: 'check' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-xs">
            <Icon name={s.icon} size={13} className="text-accent" /> {s.label}
          </span>
          {i < steps.length - 1 && <Icon name="chevronRight" size={14} className="text-faint" />}
        </div>
      ))}
      <span className="w-full pt-1 text-[11px] text-faint">Reason → Execute → Observe repeats until a final answer or the step limit (AGENT_MAX_STEPS).</span>
    </div>
  )
}
