import { useState } from 'react'
import { StatusToggle } from '../../components/roadmap/TaskRow'
import { Badge, Card, CardHeader, EmptyState, ErrorState, LoadingState, PageHeader, ProgressBar, ProgressRing, Stat, cx } from '../../components/ui'
import { api } from '../../lib/api'
import { PHASE_STATUS, daysLabel, formatDate } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { useRoadmap } from '../../lib/useRoadmap'
import type { TaskStatus } from '../../types'

const TABS: { key: TaskStatus; label: string }[] = [
  { key: 'in_progress', label: 'Active' },
  { key: 'todo', label: 'Pending' },
  { key: 'done', label: 'Completed' },
]

export default function Progress() {
  const summary = useAsync(() => api.progress(), [])
  const rm = useRoadmap()
  const [tab, setTab] = useState<TaskStatus>('in_progress')

  const header = <PageHeader title="Progress Tracker" description="Every number here is calculated live from task data — nothing is hardcoded." />
  if (summary.loading) return (<>{header}<LoadingState /></>)
  if (summary.error || !summary.data) return (<>{header}<ErrorState error={summary.error ?? new Error('No data')} onRetry={summary.reload} /></>)

  const p = summary.data
  const total = Math.max(p.total_tasks, 1)
  const phaseTitle = new Map(rm.phases.map((ph) => [ph.id, ph.title]))
  const listed = rm.tasks.filter((t) => t.status === tab)

  const setStatus = async (id: number, status: TaskStatus) => {
    if (await rm.updateTask(id, { status })) await summary.reload(true)
  }

  return (
    <>
      {header}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center justify-center gap-4 py-8">
          <ProgressRing value={p.overall_progress} size={160} stroke={12} label="overall" />
          <div className="text-center text-xs text-faint">
            Weighted: done = 1, in progress = ½
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Total tasks" value={p.total_tasks} icon="roadmap" />
            <Stat label="Completed" value={p.completed_tasks} icon="circleCheck" tone="ok" />
            <Stat label="Active" value={p.active_tasks} icon="circleHalf" tone="info" />
            <Stat label="Pending" value={p.pending_tasks} icon="circle" />
          </div>
          <Card>
            <CardHeader title="Task distribution" icon="progress" />
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-hover">
              <div className="bg-ok transition-[width]" style={{ width: `${(p.completed_tasks / total) * 100}%` }} />
              <div className="bg-info transition-[width]" style={{ width: `${(p.active_tasks / total) * 100}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" /> Completed {Math.round((p.completed_tasks / total) * 100)}%</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-info" /> Active {Math.round((p.active_tasks / total) * 100)}%</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-hover ring-1 ring-line-strong" /> Pending {Math.round((p.pending_tasks / total) * 100)}%</span>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Progress by phase" icon="layers" />
          <div className="space-y-3">
            {p.phases.map((ph) => (
              <div key={ph.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-fg/90">
                    <span className="mr-2 tabular-nums text-faint">{ph.order}</span>
                    {ph.title}
                  </span>
                  <span className="tabular-nums text-muted">{ph.progress}%</span>
                </div>
                <ProgressBar value={ph.progress} tone={ph.status === 'completed' ? 'ok' : ph.progress > 0 ? 'info' : 'neutral'} className="h-2" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Milestones" subtitle="One per phase — set deadlines in the Roadmap" icon="flag" />
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {p.milestones.map((m) => (
                <tr key={m.phase_id}>
                  <td className="py-2 pr-3">{m.title}</td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap text-muted">{formatDate(m.deadline)}</td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap text-faint">{m.status === 'completed' ? '' : daysLabel(m.days_remaining)}</td>
                  <td className="py-2 text-right">
                    <Badge tone={PHASE_STATUS[m.status].tone}>{PHASE_STATUS[m.status].label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tasks</h3>
            <div className="flex rounded-lg border border-line bg-panel-2 p-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cx('rounded-md px-3 py-1 text-xs transition-colors', tab === t.key ? 'bg-hover text-fg' : 'text-muted hover:text-fg')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {listed.length === 0 ? (
            <EmptyState icon="check" title={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} tasks`} />
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {listed.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <StatusToggle status={t.status} onClick={() => setStatus(t.id, t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done')} />
                  <span className={cx('flex-1 truncate text-sm', t.status === 'done' && 'text-faint line-through')}>{t.title}</span>
                  <span className="hidden truncate text-xs text-faint md:block md:max-w-48">{t.phase_id ? phaseTitle.get(t.phase_id) : 'No phase'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Contribution" subtitle="Tasks by assignee" icon="team" />
          {p.by_assignee.length === 0 ? (
            <p className="text-sm text-muted">No tasks yet.</p>
          ) : (
            <div className="space-y-3">
              {p.by_assignee.map((a) => (
                <div key={a.assignee_id ?? 'none'}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className={a.assignee_id ? 'text-fg/90' : 'text-faint'}>{a.name}</span>
                    <span className="tabular-nums text-muted">
                      {a.done}/{a.total}
                    </span>
                  </div>
                  <ProgressBar value={a.progress} tone="ok" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
