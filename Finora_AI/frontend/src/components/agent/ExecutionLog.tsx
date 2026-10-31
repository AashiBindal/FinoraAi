import type { AgentRun, AgentStepType } from '../../types'
import { Badge, EmptyState, Icon, cx, type IconName } from '../ui'
import type { Tone } from '../../lib/format'

const STEP: Record<AgentStepType, { label: string; icon: IconName; tone: Tone }> = {
  thought: { label: 'Reasoning', icon: 'brain', tone: 'neutral' },
  tool_call: { label: 'Tool call', icon: 'tool', tone: 'accent' },
  tool_result: { label: 'Tool result', icon: 'terminal', tone: 'ok' },
  final: { label: 'Final answer', icon: 'check', tone: 'ok' },
  error: { label: 'Error', icon: 'alert', tone: 'danger' },
  info: { label: 'Info', icon: 'info', tone: 'info' },
}

export const RUN_STATUS: Record<AgentRun['status'], { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'ok' },
  failed: { label: 'Failed', tone: 'danger' },
  not_configured: { label: 'Model not connected', tone: 'warn' },
  max_steps: { label: 'Step limit reached', tone: 'warn' },
}

export function ExecutionLog({ run, isDemo }: { run: AgentRun | null; isDemo?: boolean }) {
  if (!run) {
    return <EmptyState icon="terminal" title="No run selected" description="Send a message or select a reply to inspect the agent's steps." />
  }
  const toolsUsed = [...new Set(run.steps.filter((s) => s.type === 'tool_call').map((s) => s.tool))]

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
          Demo trace — hand-written example, not produced by a model.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={RUN_STATUS[run.status].tone} dot>
          {RUN_STATUS[run.status].label}
        </Badge>
        <span className="text-faint">
          {run.steps.length} steps · {(run.duration_ms / 1000).toFixed(2)}s
        </span>
        {run.model && <span className="font-mono text-faint">{run.model}</span>}
      </div>

      {toolsUsed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {toolsUsed.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-1 font-mono text-[11px] text-muted">
              <Icon name="tool" size={11} /> {t}
            </span>
          ))}
        </div>
      )}

      <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line">
        {run.steps.map((s) => {
          const meta = STEP[s.type]
          return (
            <li key={s.index} className="relative pl-8">
              <span
                className={cx(
                  'absolute top-0 left-0 grid size-6 place-items-center rounded-full border border-line bg-panel',
                  s.type === 'error' ? 'text-danger' : s.type === 'tool_call' ? 'text-accent' : 'text-muted',
                )}
              >
                <Icon name={meta.icon} size={12} />
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-fg">{meta.label}</span>
                {s.tool && <span className="font-mono text-accent">{s.tool}</span>}
                {s.duration_ms > 0 && <span className="ml-auto tabular-nums text-faint">{s.duration_ms}ms</span>}
              </div>
              {s.tool_input && Object.keys(s.tool_input).length > 0 && (
                <pre className="mt-1.5 overflow-x-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] text-muted">
                  {JSON.stringify(s.tool_input, null, 2)}
                </pre>
              )}
              {s.content && (
                <p
                  className={cx(
                    'mt-1 text-xs leading-relaxed break-words whitespace-pre-wrap',
                    s.type === 'tool_result' ? 'font-mono text-muted' : 'text-muted',
                  )}
                >
                  {s.content}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
