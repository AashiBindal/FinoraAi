import { useState, type FormEvent } from 'react'
import { TaskModal } from '../../components/roadmap/TaskModal'
import { TaskRow } from '../../components/roadmap/TaskRow'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Icon,
  IconButton,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Textarea,
  cx,
} from '../../components/ui'
import { api } from '../../lib/api'
import { PHASE_STATUS, daysLabel, formatDate } from '../../lib/format'
import { useRoadmap } from '../../lib/useRoadmap'
import type { Phase, PhaseInput, PhaseStatus, Task, TaskInput } from '../../types'

function daysUntil(date: string | null) {
  if (!date) return null
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()
  return Math.round(ms / 86400000)
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (title.trim() && (await onAdd(title.trim()))) setTitle('')
  }
  return (
    <form onSubmit={submit} className="mt-1 flex items-center gap-2 px-2">
      <Icon name="plus" size={14} className="text-faint" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter"
        className="h-8 flex-1 bg-transparent text-sm placeholder:text-faint focus:outline-none"
      />
    </form>
  )
}

export default function Roadmap() {
  const rm = useRoadmap()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [taskModal, setTaskModal] = useState<{ task: Task | null; defaults?: TaskInput } | null>(null)
  const [phaseForm, setPhaseForm] = useState<{ phase: Phase | null; data: PhaseInput } | null>(null)

  const memberById = new Map(rm.members.map((m) => [m.id, m]))
  const unphased = rm.tasks.filter((t) => t.phase_id === null)
  const isOpen = (p: Phase) => expanded[p.id] ?? p.status === 'in_progress'

  async function saveTask(data: TaskInput) {
    const ok = taskModal?.task ? await rm.updateTask(taskModal.task.id, data) : await rm.createTask(data)
    if (ok) setTaskModal(null)
  }

  async function savePhase() {
    if (!phaseForm?.data.title?.trim()) return
    const ok = await rm.mutate(() =>
      phaseForm.phase ? api.phases.update(phaseForm.phase.id, phaseForm.data) : api.phases.create(phaseForm.data),
    )
    if (ok) setPhaseForm(null)
  }

  const header = (
    <PageHeader
      title="Development Roadmap"
      description="Nine phases from problem to demo. Phase progress and status update automatically from task completion."
      actions={
        <>
          <Button icon="plus" onClick={() => setPhaseForm({ phase: null, data: { title: '', description: '', deadline: null } })}>
            Add phase
          </Button>
          <Button variant="primary" icon="plus" onClick={() => setTaskModal({ task: null })}>
            New task
          </Button>
        </>
      }
    />
  )

  if (rm.loading) return (<>{header}<LoadingState /></>)
  if (rm.error) return (<>{header}<ErrorState error={rm.error} onRetry={rm.reload} /></>)

  return (
    <>
      {header}
      <div className="space-y-3">
        {rm.phases.map((phase) => {
          const open = isOpen(phase)
          const days = daysUntil(phase.deadline)
          return (
            <Card key={phase.id} padded={false} className={cx(phase.status === 'in_progress' && 'border-line-strong')}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => setExpanded({ ...expanded, [phase.id]: !open })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-expanded={open}
                >
                  <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} className="text-faint" />
                  <span
                    className={cx(
                      'grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums',
                      phase.status === 'completed' ? 'bg-ok-soft text-ok' : phase.status === 'in_progress' ? 'bg-info-soft text-info' : 'bg-hover text-muted',
                    )}
                  >
                    {phase.status === 'completed' ? <Icon name="check" size={13} /> : phase.order}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{phase.title}</span>
                    <span className="block truncate text-xs text-faint">{phase.description}</span>
                  </span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <ProgressBar value={phase.progress} tone={phase.status === 'completed' ? 'ok' : 'info'} />
                    <div className="mt-1 text-[11px] tabular-nums text-faint">
                      {phase.done_count}/{phase.task_count} · {phase.progress}%
                    </div>
                  </div>
                  <span className="hidden w-24 text-right text-xs md:block">
                    <span className="block text-muted">{formatDate(phase.deadline)}</span>
                    {phase.status !== 'completed' && phase.deadline && (
                      <span className={days !== null && days < 0 ? 'text-danger' : 'text-faint'}>{daysLabel(days)}</span>
                    )}
                  </span>
                  <Badge tone={PHASE_STATUS[phase.status].tone} dot className="w-24 justify-center">
                    {PHASE_STATUS[phase.status].label}
                  </Badge>
                  <IconButton
                    icon="edit"
                    label="Edit phase"
                    onClick={() =>
                      setPhaseForm({
                        phase,
                        data: {
                          title: phase.title,
                          description: phase.description,
                          deadline: phase.deadline,
                          status: phase.status,
                          auto_status: phase.auto_status,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {open && (
                <div className="border-t border-line px-2 py-2">
                  {phase.tasks.length === 0 && <p className="px-2 py-2 text-xs text-faint">No tasks yet.</p>}
                  <ul>
                    {phase.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        member={t.assignee_id ? memberById.get(t.assignee_id) : undefined}
                        onStatus={(status) => rm.updateTask(t.id, { status })}
                        onEdit={() => setTaskModal({ task: t })}
                        onDelete={() => confirm(`Delete "${t.title}"?`) && rm.deleteTask(t.id)}
                      />
                    ))}
                  </ul>
                  <QuickAdd onAdd={(title) => rm.createTask({ title, phase_id: phase.id })} />
                </div>
              )}
            </Card>
          )
        })}

        {unphased.length > 0 && (
          <Card padded={false}>
            <div className="px-4 py-3.5 text-sm font-medium">
              Unassigned to a phase <span className="text-faint">({unphased.length})</span>
            </div>
            <ul className="border-t border-line px-2 py-2">
              {unphased.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  member={t.assignee_id ? memberById.get(t.assignee_id) : undefined}
                  onStatus={(status) => rm.updateTask(t.id, { status })}
                  onEdit={() => setTaskModal({ task: t })}
                  onDelete={() => confirm(`Delete "${t.title}"?`) && rm.deleteTask(t.id)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <TaskModal
        open={!!taskModal}
        task={taskModal?.task ?? null}
        defaults={taskModal?.defaults}
        phases={rm.phases}
        members={rm.members}
        onClose={() => setTaskModal(null)}
        onSave={saveTask}
      />

      <Modal
        open={!!phaseForm}
        title={phaseForm?.phase ? `Edit phase ${phaseForm.phase.order}` : 'Add phase'}
        onClose={() => setPhaseForm(null)}
        footer={
          <div className="flex w-full items-center justify-between">
            {phaseForm?.phase ? (
              <Button
                variant="danger"
                icon="trash"
                onClick={async () => {
                  if (phaseForm.phase && confirm(`Delete phase "${phaseForm.phase.title}" and all its tasks?`)) {
                    const id = phaseForm.phase.id
                    if (await rm.mutate(() => api.phases.remove(id))) setPhaseForm(null)
                  }
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhaseForm(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={savePhase} disabled={!phaseForm?.data.title?.trim()}>
                Save
              </Button>
            </div>
          </div>
        }
      >
        {phaseForm && (
          <>
            <Field label="Title">
              <Input autoFocus value={phaseForm.data.title ?? ''} onChange={(e) => setPhaseForm({ ...phaseForm, data: { ...phaseForm.data, title: e.target.value } })} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={phaseForm.data.description ?? ''} onChange={(e) => setPhaseForm({ ...phaseForm, data: { ...phaseForm.data, description: e.target.value } })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deadline">
                <Input type="date" value={phaseForm.data.deadline ?? ''} onChange={(e) => setPhaseForm({ ...phaseForm, data: { ...phaseForm.data, deadline: e.target.value || null } })} />
              </Field>
              {phaseForm.phase && (
                <Field label="Status">
                  <Select
                    value={phaseForm.data.auto_status ? 'auto' : phaseForm.data.status}
                    onChange={(e) => {
                      const v = e.target.value
                      setPhaseForm({
                        ...phaseForm,
                        data: v === 'auto' ? { ...phaseForm.data, auto_status: true, status: undefined } : { ...phaseForm.data, auto_status: false, status: v as PhaseStatus },
                      })
                    }}
                  >
                    <option value="auto">Automatic (from tasks)</option>
                    {(Object.keys(PHASE_STATUS) as PhaseStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {PHASE_STATUS[s].label} (manual)
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
