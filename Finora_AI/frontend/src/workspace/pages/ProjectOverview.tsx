import { useEffect, useState } from 'react'
import { Button, Card, Field, Icon, Input, LoadingState, PageHeader, Textarea, useToast, type IconName } from '../../components/ui'
import { api } from '../../lib/api'
import { lines } from '../../lib/format'
import { useWorkspace } from '../../lib/workspace'
import type { Project, ProjectUpdate } from '../../types'

type FieldKey = 'problem_statement' | 'target_users' | 'proposed_solution' | 'key_features' | 'expected_impact' | 'objectives'

// Field definitions drive both the read view and the edit form.
const SECTIONS: { key: FieldKey; title: string; icon: IconName; list?: boolean; hint: string; wide?: boolean }[] = [
  { key: 'problem_statement', title: 'Problem statement', icon: 'target', hint: 'The real-world problem, in 2-4 sentences.', wide: true },
  { key: 'target_users', title: 'Target users', icon: 'users', list: true, hint: 'One user group per line.' },
  { key: 'objectives', title: 'Project objectives', icon: 'flag', list: true, hint: 'One objective per line.' },
  { key: 'proposed_solution', title: 'Proposed solution', icon: 'lightbulb', hint: 'How the agent solves the problem.', wide: true },
  { key: 'key_features', title: 'Key features', icon: 'sparkles', list: true, hint: 'One feature per line.' },
  { key: 'expected_impact', title: 'Expected impact', icon: 'rocket', list: true, hint: 'Measurable outcomes, one per line.' },
]

export default function ProjectOverview() {
  const { project, setProject } = useWorkspace()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProjectUpdate>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project && !editing) setDraft(project)
  }, [project, editing])

  if (!project) return (<><PageHeader title="Project Overview" /><LoadingState /></>)

  const set = (k: keyof Project) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...draft }
      delete payload.id
      delete payload.updated_at
      setProject(await api.project.update(payload as ProjectUpdate))
      toast.success('Project overview saved')
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const empty = SECTIONS.every((s) => !project[s.key])

  return (
    <>
      <PageHeader
        eyebrow={project.hackathon_name || undefined}
        title="Project Overview"
        description="The single source of truth for what we're building and why. Update this as soon as the problem statement is announced."
        actions={
          editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon="save" loading={saving} onClick={save}>
                Save changes
              </Button>
            </>
          ) : (
            <Button icon="edit" onClick={() => setEditing(true)}>
              Edit overview
            </Button>
          )
        }
      />

      {editing ? (
        <div className="space-y-4">
          <Card className="grid gap-4 md:grid-cols-2">
            <Field label="Project name">
              <Input value={draft.name ?? ''} onChange={set('name')} />
            </Field>
            <Field label="Hackathon name">
              <Input value={draft.hackathon_name ?? ''} onChange={set('hackathon_name')} placeholder="e.g. Agentic AI Hackathon 2026" />
            </Field>
            <Field label="Tagline">
              <Input value={draft.tagline ?? ''} onChange={set('tagline')} placeholder="One line that sells the idea" />
            </Field>
            <Field label="Demo date">
              <Input type="date" value={draft.demo_date ?? ''} onChange={set('demo_date')} />
            </Field>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map((s) => (
              <Card key={s.key} className={s.wide ? 'md:col-span-2' : ''}>
                <Field label={s.title} hint={s.hint}>
                  <Textarea rows={s.wide ? 5 : 4} value={draft[s.key] ?? ''} onChange={set(s.key)} />
                </Field>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {empty && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
              <Icon name="info" />
              These fields are intentionally blank until the hackathon problem statement is announced. Click <b className="text-fg">Edit overview</b> to fill them in.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map((s) => {
              const value = project[s.key]
              return (
                <Card key={s.key} className={s.wide ? 'md:col-span-2' : ''}>
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                    <Icon name={s.icon} size={14} className="text-accent" />
                    {s.title}
                  </div>
                  {!value ? (
                    <p className="text-sm text-faint italic">Not defined yet</p>
                  ) : s.list ? (
                    <ul className="space-y-1.5 text-sm">
                      {lines(value).map((l, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                          {l}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg/90">{value}</p>
                  )}
                </Card>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-faint">Last updated {new Date(project.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </>
      )}
    </>
  )
}
