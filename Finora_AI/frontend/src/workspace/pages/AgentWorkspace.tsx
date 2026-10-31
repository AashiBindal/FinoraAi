import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DEMO_RUN } from '../../components/agent/demoRun'
import { ExecutionLog, RUN_STATUS } from '../../components/agent/ExecutionLog'
import { Badge, Button, Card, CardHeader, Icon, PageHeader, cx, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import type { AgentRun } from '../../types'

const SESSION = 'default'
const SUGGESTIONS = [
  'What is our current project progress?',
  'List the tasks that are still to do.',
  'What is 18% of 2450?',
  'Create a high-priority task in phase 1: "Read the judging criteria".',
]

function ThinkingBubble() {
  return (
    <div className="flex items-center gap-3">
      <AgentAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-line bg-panel-2 px-4 py-3">
        <span className="thinking-dot size-1.5 rounded-full bg-muted" />
        <span className="thinking-dot size-1.5 rounded-full bg-muted" />
        <span className="thinking-dot size-1.5 rounded-full bg-muted" />
        <span className="ml-2 text-xs text-faint">Agent is reasoning…</span>
      </div>
    </div>
  )
}

const AgentAvatar = () => (
  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-panel-2 text-accent">
    <Icon name="agent" size={14} />
  </span>
)

export default function AgentWorkspace() {
  const toast = useToast()
  const config = useAsync(() => api.agent.config(), [])
  const tools = useAsync(() => api.agent.tools(), [])
  const history = useAsync(() => api.agent.runs(SESSION), [])

  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [selected, setSelected] = useState<AgentRun | null>(null)
  const [showDemo, setShowDemo] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const runs = history.data ?? []
  const configured = config.data?.configured ?? false

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [runs.length, pending])

  async function send(text = input) {
    const message = text.trim()
    if (!message || pending) return
    setInput('')
    setPending(message)
    setShowDemo(false)
    try {
      // Streaming placeholder: when /api/agent/stream is implemented, switch
      // this call to an EventSource / fetch-stream and append steps live.
      const run = await api.agent.run(message, SESSION)
      history.setData([...runs, run])
      setSelected(run)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Agent request failed')
      setInput(message)
    } finally {
      setPending(null)
    }
  }

  async function clear() {
    try {
      await api.agent.clear(SESSION)
      history.setData([])
      setSelected(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not clear history')
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const logRun = showDemo ? DEMO_RUN : selected ?? runs[runs.length - 1] ?? null

  return (
    <>
      <PageHeader
        title="Agent Workspace"
        description="Talk to the agent and inspect every reasoning step and tool call it makes."
        actions={
          <>
            <Button size="sm" variant="ghost" icon="eye" onClick={() => setShowDemo((v) => !v)}>
              {showDemo ? 'Hide example' : 'Preview example trace'}
            </Button>
            <Button size="sm" icon="trash" onClick={clear} disabled={runs.length === 0}>
              Clear chat
            </Button>
          </>
        }
      />

      {config.data && !configured && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn-soft/50 px-4 py-3 text-sm">
          <Icon name="key" className="mt-0.5 text-warn" />
          <div>
            <div className="font-medium">No AI model connected — the agent will not generate answers yet.</div>
            <div className="mt-0.5 text-muted">
              {config.data.message} The runtime, tools and logging below are real; nothing here is simulated.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Chat */}
        <Card padded={false} className="flex h-[calc(100vh-15rem)] min-h-[520px] flex-col">
          <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-5">
            {runs.length === 0 && !pending && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-4 grid size-12 place-items-center rounded-2xl border border-line bg-panel-2 text-accent">
                  <Icon name="sparkles" size={20} />
                </span>
                <p className="font-medium">Start a conversation</p>
                <p className="mt-1 max-w-sm text-sm text-muted">The agent can reason, call tools and report each step in the execution log.</p>
                <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-left text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {runs.map((run) => (
              <div key={run.id} className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-2.5 text-sm whitespace-pre-wrap text-fg">{run.input}</div>
                </div>
                <div className="flex gap-3">
                  <AgentAvatar />
                  <button
                    onClick={() => {
                      setSelected(run)
                      setShowDemo(false)
                    }}
                    className={cx(
                      'max-w-[85%] rounded-2xl rounded-tl-sm border px-4 py-3 text-left text-sm transition-colors',
                      logRun?.id === run.id ? 'border-line-strong bg-panel-2' : 'border-line bg-panel-2/60 hover:border-line-strong',
                    )}
                  >
                    <p className={cx('whitespace-pre-wrap', run.status === 'completed' ? 'text-fg' : 'text-muted')}>
                      {run.output || run.error || 'No output'}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-faint">
                      <Badge tone={RUN_STATUS[run.status].tone}>{RUN_STATUS[run.status].label}</Badge>
                      <span>{run.steps.filter((s) => s.type === 'tool_call').length} tool calls</span>
                      <span>· view log</span>
                    </div>
                  </button>
                </div>
              </div>
            ))}

            {pending && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-2.5 text-sm whitespace-pre-wrap">{pending}</div>
                </div>
                <ThinkingBubble />
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2 rounded-xl border border-line bg-panel-2 p-2 focus-within:border-line-strong">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Ask the agent to do something…  (Enter to send, Shift+Enter for new line)"
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm placeholder:text-faint focus:outline-none"
              />
              <Button variant="primary" icon="send" onClick={() => send()} loading={!!pending} disabled={!input.trim()}>
                Send
              </Button>
            </div>
          </div>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Agent status" icon="activity" />
            <dl className="space-y-2.5 text-sm">
              {[
                ['State', pending ? <Badge tone="info" dot>Running</Badge> : <Badge dot>Idle</Badge>],
                ['Model', configured ? <Badge tone="ok" dot>Connected</Badge> : <Badge tone="warn" dot>Not connected</Badge>],
                ['Provider', <span className="font-mono text-xs">{config.data?.provider ?? '—'}</span>],
                ['Model ID', <span className="font-mono text-xs">{config.data?.model || '—'}</span>],
                ['Max steps', config.data?.max_steps ?? '—'],
                ['Streaming', <Badge>Placeholder</Badge>],
              ].map(([k, v], i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Execution log" subtitle="Reasoning, tool calls and results" icon="terminal" />
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <ExecutionLog run={logRun} isDemo={showDemo} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Registered tools" subtitle="From the backend tool registry" icon="tool" />
            <ul className="space-y-2">
              {(tools.data ?? []).map((t) => (
                <li key={t.name} className="rounded-md border border-line bg-panel-2 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-fg">{t.name}</span>
                    <Badge>{t.category}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-faint">{t.description}</p>
                </li>
              ))}
              {tools.error && <li className="text-xs text-danger">{tools.error.message}</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
