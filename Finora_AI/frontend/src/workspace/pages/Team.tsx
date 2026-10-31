import { useState } from 'react'
import { TaskModal } from '../../components/roadmap/TaskModal'
import { StatusToggle } from '../../components/roadmap/TaskRow'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  IconButton,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  ProgressBar,
  SampleBadge,
  Textarea,
  cx,
} from '../../components/ui'
import { api } from '../../lib/api'
import { initials } from '../../lib/format'
import { useRoadmap } from '../../lib/useRoadmap'
import type { Task, TaskInput, TeamMember, TeamMemberInput } from '../../types'

const EMPTY: TeamMemberInput = { name: '', role: '', responsibilities: '', email: '', github: '' }
const NEXT: Record<Task['status'], Task['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

export default function Team() {
  const rm = useRoadmap()
  const [memberForm, setMemberForm] = useState<{ member: TeamMember | null; data: TeamMemberInput } | null>(null)
  const [taskModal, setTaskModal] = useState<{ task: Task | null; defaults?: TaskInput } | null>(null)

  async function saveMember() {
    if (!memberForm?.data.name?.trim()) return
    const { member, data } = memberForm
    if (await rm.mutate(() => (member ? api.team.update(member.id, data) : api.team.create(data)))) setMemberForm(null)
  }

  async function removeMember(m: TeamMember) {
    if (confirm(`Remove ${m.name}? Their tasks become unassigned.`)) await rm.mutate(() => api.team.remove(m.id))
  }

  async function saveTask(data: TaskInput) {
    const ok = taskModal?.task ? await rm.updateTask(taskModal.task.id, data) : await rm.createTask(data)
    if (ok) setTaskModal(null)
  }

  const header = (
    <PageHeader
      title="Team Workspace"
      description="Who is doing what. Contribution is calculated from tasks assigned to each member."
      actions={
        <Button variant="primary" icon="plus" onClick={() => setMemberForm({ member: null, data: { ...EMPTY } })}>
          Add member
        </Button>
      }
    />
  )
  if (rm.loading) return (<>{header}<LoadingState /></>)
  if (rm.error) return (<>{header}<ErrorState error={rm.error} onRetry={rm.reload} /></>)

  const unassigned = rm.tasks.filter((t) => t.assignee_id === null && t.status !== 'done')

  return (
    <>
      {header}
      {rm.members.some((m) => m.is_sample) && (
        <p className="mb-4 flex items-center gap-2 text-xs text-muted">
          <Icon name="info" size={14} /> Members marked <SampleBadge /> are placeholders. Edit them with your real team details, or remove them.
        </p>
      )}

      {rm.members.length === 0 ? (
        <EmptyState icon="team" title="No team members yet" action={<Button icon="plus" onClick={() => setMemberForm({ member: null, data: { ...EMPTY } })}>Add member</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rm.members.map((m) => {
            const tasks = rm.tasks.filter((t) => t.assignee_id === m.id)
            const done = tasks.filter((t) => t.status === 'done').length
            return (
              <Card key={m.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{initials(m.name) || '?'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{m.name}</span>
                      {m.is_sample && <SampleBadge />}
                    </div>
                    <div className="text-sm text-muted">{m.role || 'No role set'}</div>
                    <div className="mt-1 flex gap-3 text-xs text-faint">
                      {m.email && <span className="flex items-center gap-1"><Icon name="mail" size={12} />{m.email}</span>}
                      {m.github && <span className="flex items-center gap-1"><Icon name="github" size={12} />{m.github}</span>}
                    </div>
                  </div>
                  <div className="flex">
                    <IconButton icon="edit" label="Edit member" onClick={() => setMemberForm({ member: m, data: { name: m.name, role: m.role, responsibilities: m.responsibilities, email: m.email, github: m.github } })} />
                    <IconButton icon="trash" label="Remove member" onClick={() => removeMember(m)} />
                  </div>
                </div>

                {m.responsibilities && <p className="mt-3 text-sm text-muted">{m.responsibilities}</p>}

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted">Contribution</span>
                    <span className="tabular-nums text-faint">{done}/{tasks.length} tasks done</span>
                  </div>
                  <ProgressBar value={tasks.length ? (done / tasks.length) * 100 : 0} tone="ok" />
                </div>

                <ul className="mt-4 flex-1 space-y-1">
                  {tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-panel-2">
                      <StatusToggle status={t.status} onClick={() => rm.updateTask(t.id, { status: NEXT[t.status] })} />
                      <button className={cx('flex-1 truncate text-left', t.status === 'done' && 'text-faint line-through')} onClick={() => setTaskModal({ task: t })}>
                        {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="ghost" icon="plus" className="mt-2 self-start" onClick={() => setTaskModal({ task: null, defaults: { assignee_id: m.id } })}>
                  Assign new task
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {unassigned.length > 0 && rm.members.length > 0 && (
        <Card className="mt-4">
          <div className="mb-3 text-sm font-semibold">
            Unassigned open tasks <span className="font-normal text-faint">({unassigned.length})</span>
          </div>
          <ul className="grid gap-1 md:grid-cols-2">
            {unassigned.map((t) => (
              <li key={t.id}>
                <button className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-panel-2 hover:text-fg" onClick={() => setTaskModal({ task: t })}>
                  <Icon name="circle" size={13} className="text-faint" /> <span className="truncate">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={!!memberForm}
        title={memberForm?.member ? 'Edit member' : 'Add team member'}
        onClose={() => setMemberForm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMemberForm(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveMember} disabled={!memberForm?.data.name?.trim()}>Save</Button>
          </>
        }
      >
        {memberForm && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input autoFocus value={memberForm.data.name} onChange={(e) => setMemberForm({ ...memberForm, data: { ...memberForm.data, name: e.target.value } })} />
              </Field>
              <Field label="Role">
                <Input value={memberForm.data.role} onChange={(e) => setMemberForm({ ...memberForm, data: { ...memberForm.data, role: e.target.value } })} placeholder="e.g. AI engineer" />
              </Field>
              <Field label="Email">
                <Input type="email" value={memberForm.data.email} onChange={(e) => setMemberForm({ ...memberForm, data: { ...memberForm.data, email: e.target.value } })} />
              </Field>
              <Field label="GitHub username">
                <Input value={memberForm.data.github} onChange={(e) => setMemberForm({ ...memberForm, data: { ...memberForm.data, github: e.target.value } })} />
              </Field>
            </div>
            <Field label="Responsibilities">
              <Textarea rows={3} value={memberForm.data.responsibilities} onChange={(e) => setMemberForm({ ...memberForm, data: { ...memberForm.data, responsibilities: e.target.value } })} />
            </Field>
          </>
        )}
      </Modal>

      <TaskModal
        open={!!taskModal}
        task={taskModal?.task ?? null}
        defaults={taskModal?.defaults}
        phases={rm.phases}
        members={rm.members}
        onClose={() => setTaskModal(null)}
        onSave={saveTask}
      />
    </>
  )
}
