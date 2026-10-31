import { useEffect, useState } from 'react'
import type { Phase, Task, TaskInput, TaskPriority, TaskStatus, TeamMember } from '../../types'
import { PRIORITY, TASK_STATUS } from '../../lib/format'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'

export function TaskModal({
  open,
  task,
  defaults,
  phases,
  members,
  onClose,
  onSave,
}: {
  open: boolean
  task: Task | null
  defaults?: TaskInput
  phases: Phase[]
  members: TeamMember[]
  onClose: () => void
  onSave: (data: TaskInput) => Promise<void>
}) {
  const [form, setForm] = useState<TaskInput>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      task
        ? {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            phase_id: task.phase_id,
            assignee_id: task.assignee_id,
            due_date: task.due_date,
          }
        : { title: '', description: '', status: 'todo', priority: 'medium', phase_id: null, assignee_id: null, due_date: null, ...defaults },
    )
  }, [open, task, defaults])

  const submit = async () => {
    if (!form.title?.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, title: form.title.trim() })
    } finally {
      setSaving(false)
    }
  }

  const num = (v: string) => (v ? Number(v) : null)

  return (
    <Modal
      open={open}
      title={task ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} disabled={!form.title?.trim()} onClick={submit}>
            {task ? 'Save' : 'Create task'}
          </Button>
        </>
      }
    >
      <Field label="Title">
        <Input autoFocus value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      <Field label="Description">
        <Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
            {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            {(Object.keys(PRIORITY) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phase">
          <Select value={form.phase_id ?? ''} onChange={(e) => setForm({ ...form, phase_id: num(e.target.value) })}>
            <option value="">No phase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.order}. {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assignee">
          <Select value={form.assignee_id ?? ''} onChange={(e) => setForm({ ...form, assignee_id: num(e.target.value) })}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={form.due_date ?? ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} />
        </Field>
      </div>
    </Modal>
  )
}
