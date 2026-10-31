import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Icon, Input, PageHeader, Textarea, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { useWorkspace } from '../../lib/workspace'

const ENV_SNIPPET = `# workspace-api/.env  (copy from workspace-api/.env.example, never commit)
AI_PROVIDER=openai          # none | openai | anthropic
AI_MODEL=your-model-id      # e.g. a model your provider lists
AI_API_KEY=sk-...           # secret — stays on the backend
AI_BASE_URL=                # optional: Groq / OpenRouter / Ollama URL`

function CodeBlock({ code }: { code: string }) {
  const toast = useToast()
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-relaxed text-muted">{code}</pre>
      <button
        onClick={() => navigator.clipboard?.writeText(code).then(() => toast.success('Copied'))}
        className="absolute top-2 right-2 rounded-md border border-line bg-panel-2 px-2 py-1 text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg"
      >
        Copy
      </button>
    </div>
  )
}

export default function Settings() {
  const toast = useToast()
  const { project, setProject, health } = useWorkspace()
  const config = useAsync(() => api.agent.config(), [])
  const [form, setForm] = useState({ name: '', tagline: '', description: '', hackathon_name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) setForm({ name: project.name, tagline: project.tagline, description: project.description, hackathon_name: project.hackathon_name })
  }, [project])

  async function save() {
    if (!form.name.trim()) return toast.error('Project name is required')
    setSaving(true)
    try {
      setProject(await api.project.update(form))
      toast.success('Settings saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const c = config.data

  return (
    <>
      <PageHeader title="Settings" description="Project identity, AI provider status and environment configuration." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Project" icon="overview" />
          <div className="space-y-4">
            <Field label="Project name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Hackathon name">
              <Input value={form.hackathon_name} onChange={(e) => setForm({ ...form, hackathon_name: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Button variant="primary" icon="save" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="AI provider"
              subtitle="Read-only — configured through backend environment variables"
              icon="key"
              action={c && <Badge tone={c.configured ? 'ok' : 'warn'} dot>{c.configured ? 'Connected' : 'Not configured'}</Badge>}
            />
            {config.error ? (
              <p className="text-sm text-danger">{config.error.message}</p>
            ) : (
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
                <dt className="text-muted">Provider</dt>
                <dd className="font-mono text-xs">{c?.provider ?? '—'}</dd>
                <dt className="text-muted">Model</dt>
                <dd className="font-mono text-xs">{c?.model || '—'}</dd>
                <dt className="text-muted">Base URL</dt>
                <dd className="font-mono text-xs">{c?.base_url || 'provider default'}</dd>
                <dt className="text-muted">Max steps</dt>
                <dd className="font-mono text-xs">{c?.max_steps ?? '—'}</dd>
                <dt className="text-muted">Supported</dt>
                <dd className="flex flex-wrap gap-1">{c?.supported_providers.map((p) => <Badge key={p}>{p}</Badge>)}</dd>
              </dl>
            )}
            {c && <p className="mt-4 rounded-md bg-panel-2 px-3 py-2 text-xs text-muted">{c.message}</p>}
          </Card>

          <Card>
            <CardHeader title="Environment" icon="server" />
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Backend</dt>
              <dd>{health ? <Badge tone="ok" dot>{health.status}</Badge> : <Badge tone="danger" dot>offline</Badge>}</dd>
              <dt className="text-muted">Environment</dt>
              <dd className="font-mono text-xs">{health?.environment ?? '—'}</dd>
              <dt className="text-muted">Database</dt>
              <dd className="font-mono text-xs">{health ? `${health.database_engine} · ${health.database}` : '—'}</dd>
              <dt className="text-muted">API docs</dt>
              <dd>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                  localhost:8000/docs
                </a>
              </dd>
            </dl>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader title="Connecting an AI model" subtitle="Takes about a minute" icon="plug" />
          <ol className="mb-4 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="text-accent">1.</span> Copy <code className="font-mono text-xs text-fg">.env.example</code> to <code className="font-mono text-xs text-fg">.env</code> in the repository root.</li>
            <li className="flex gap-2"><span className="text-accent">2.</span> Set the provider, model and key as below. <b className="text-fg">Never</b> put keys in frontend code or commit <code className="font-mono text-xs text-fg">.env</code>.</li>
            <li className="flex gap-2"><span className="text-accent">3.</span> Restart the backend. This page and the Agent Workspace will show “Connected”.</li>
          </ol>
          <CodeBlock code={ENV_SNIPPET} />
          <p className="mt-3 flex items-start gap-2 text-xs text-faint">
            <Icon name="info" size={13} className="mt-0.5" />
            Any OpenAI-compatible endpoint works with AI_PROVIDER=openai plus AI_BASE_URL — including Groq, OpenRouter, Together and local Ollama (http://localhost:11434/v1, no key needed).
          </p>
        </Card>
      </div>
    </>
  )
}
