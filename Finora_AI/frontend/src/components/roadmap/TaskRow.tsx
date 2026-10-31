import type { Task, TeamMember } from '../../types'
import { PRIORITY, formatDate, initials } from '../../lib/format'
import { Badge, Icon, IconButton, cx } from '../ui'

const NEXT: Record<Task['status'], Task['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

export function StatusToggle({ status, onClick }: { status: Task['status']; onClick: () => void }) {
  const label = { todo: 'Start task', in_progress: 'Mark done', done: 'Reopen task' }[status]
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors',
        status === 'done' && 'border-ok bg-ok text-bg',
        status === 'in_progress' && 'border-info text-info',
        status === 'todo' && 'border-line-strong text-transparent hover:border-muted',
      )}
    >
      {status === 'done' ? (
        <Icon name="check" size={11} strokeWidth={3} />
      ) : status === 'in_progress' ? (
        <span className="size-2 rounded-full bg-info" style={{ clipPath: 'inset(0 50% 0 0)' }} />
      ) : null}
    </button>
  )
}

export function TaskRow({
  task,
  member,
  onStatus,
  onEdit,
  onDelete,
}: {
  task: Task
  member?: TeamMember
  onStatus: (status: Task['status']) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-panel-2">
      <StatusToggle status={task.status} onClick={() => onStatus(NEXT[task.status])} />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={cx('block truncate text-sm', task.status === 'done' && 'text-faint line-through')}>{task.title}</span>
        {task.description && <span className="block truncate text-xs text-faint">{task.description}</span>}
      </button>
      {task.status === 'in_progress' && <Badge tone="info">In progress</Badge>}
      {task.priority !== 'medium' && <Badge tone={PRIORITY[task.priority].tone}>{PRIORITY[task.priority].label}</Badge>}
      {task.due_date && <span className="hidden text-xs text-faint sm:inline">{formatDate(task.due_date)}</span>}
      {member && (
        <span title={member.name} className="grid size-6 place-items-center rounded-full bg-hover text-[10px] font-semibold text-muted">
          {initials(member.name)}
        </span>
      )}
      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconButton icon="edit" label="Edit task" onClick={onEdit} />
        <IconButton icon="trash" label="Delete task" onClick={onDelete} />
      </div>
    </li>
  )
}
