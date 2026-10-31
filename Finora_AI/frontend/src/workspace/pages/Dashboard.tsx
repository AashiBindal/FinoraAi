import { api } from '../../lib/api'
import { PHASE_STATUS, daysLabel, formatDate, timeAgo } from '../../lib/format'
import { Link } from '../../lib/router'
import { useAsync } from '../../lib/useAsync'
import { useWorkspace } from '../../lib/workspace'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  ProgressBar,
  ProgressRing,
  Stat,
  cx,
  type IconName,
} from '../../components/ui'

const QUICK_LINKS: { to: string; label: string; desc: string; icon: IconName }[] = [
  { to: '/workspace/agent', label: 'Agent Workspace', desc: 'Chat with the agent, inspect steps', icon: 'agent' },
  { to: '/workspace/overview', label: 'Problem & Solution', desc: 'Edit problem statement', icon: 'target' },
  { to: '/workspace/roadmap', label: 'Roadmap', desc: 'Phases and tasks', icon: 'roadmap' },
  { to: '/workspace/docs', label: 'Documentation', desc: '10 organised sections', icon: 'docs' },
]

const ACTIVITY_ICON: Record<string, IconName> = {
  task: 'check',
  phase: 'flag',
  project: 'overview',
  team: 'team',
  docs: 'docs',
  agent: 'agent',
  system: 'sparkles',
}

export default function Dashboard() {
  const { project } = useWorkspace()
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.progress(), api.project.activities(8)]).then(([progress, activities]) => ({ progress, activities })),
    [],
  )

  const header = (
    <PageHeader
      eyebrow={project?.hackathon_name || 'Agentic AI Hackathon'}
      title={project?.name ?? 'Dashboard'}
      description={project?.tagline || project?.description || 'Project overview and status at a glance.'}
      actions={
        <Link to="/workspace/agent">
          <Button variant="primary" icon="agent">
            Open agent
          </Button>
        </Link>
      }
    />
  )

  if (loading) return (<>{header}<LoadingState /></>)
  if (error || !data) return (<>{header}<ErrorState error={error ?? new Error('No data')} onRetry={reload} /></>)

  const { progress: p, activities } = data
  const upcoming = p.milestones.filter((m) => m.status !== 'completed').slice(0, 4)

  return (
    <>
      {header}

      {!project?.problem_statement && (
        <Link
          to="/workspace/overview"
          className="mb-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm transition-colors hover:border-accent/60"
        >
          <Icon name="lightbulb" className="text-accent" />
          <span className="flex-1">
            <span className="font-medium">Problem statement not set yet.</span>{' '}
            <span className="text-muted">Add it in Project Overview as soon as the organisers announce it.</span>
          </span>
          <Icon name="arrowRight" className="text-accent" />
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <Card className="flex items-center gap-6">
          <ProgressRing value={p.overall_progress} label="complete" />
          <div className="min-w-0 space-y-3">
            <div>
              <div className="text-xs text-muted">Current phase</div>
              <div className="mt-0.5 font-medium">
                {p.current_phase ? `${p.current_phase.order}. ${p.current_phase.title}` : 'All phases complete'}
              </div>
            </div>
            {p.current_phase && (
              <div className="space-y-1.5">
                <ProgressBar value={p.current_phase.progress} tone="info" />
                <div className="text-xs text-faint">
                  {p.current_phase.done}/{p.current_phase.total} tasks · {p.current_phase.progress}%
                </div>
              </div>
            )}
            <Badge tone="accent" dot>
              {p.phases_completed}/{p.phases_total} phases done
            </Badge>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Completed" value={p.completed_tasks} icon="circleCheck" tone="ok" hint={`of ${p.total_tasks} tasks`} />
          <Stat label="In progress" value={p.active_tasks} icon="circleHalf" tone="info" hint="active now" />
          <Stat label="Pending" value={p.pending_tasks} icon="circle" hint="not started" />
          <Stat label="Milestones" value={`${p.phases_completed}/${p.phases_total}`} icon="flag" tone="accent" hint="phases complete" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Development phases"
            subtitle="Progress is calculated from each phase's tasks"
            icon="roadmap"
            action={
              <Link to="/workspace/roadmap" className="text-xs text-muted hover:text-fg">
                Open roadmap →
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {p.phases.map((ph) => (
              <li key={ph.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_6rem_5.5rem] items-center gap-3 py-2.5 text-sm">
                <span className="text-xs tabular-nums text-faint">{ph.order}</span>
                <span className={cx('truncate', ph.status === 'completed' ? 'text-muted' : 'text-fg')}>{ph.title}</span>
                <ProgressBar value={ph.progress} tone={ph.status === 'completed' ? 'ok' : 'info'} />
                <span className="text-right">
                  <Badge tone={PHASE_STATUS[ph.status].tone}>{PHASE_STATUS[ph.status].label}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming milestones" icon="flag" />
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">Every phase is complete. Time to demo.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((m) => (
                  <li key={m.phase_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{m.title}</span>
                      <span className="text-xs text-faint">{m.deadline ? formatDate(m.deadline) : 'Set a deadline in Roadmap'}</span>
                    </span>
                    <Badge tone={m.days_remaining !== null && m.days_remaining < 0 ? 'danger' : 'neutral'}>
                      {daysLabel(m.days_remaining)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent activity" icon="activity" />
            {activities.length === 0 ? (
              <EmptyState icon="activity" title="No activity yet" />
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-hover text-muted">
                      <Icon name={ACTIVITY_ICON[a.kind] ?? 'activity'} size={13} />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-fg/90">{a.message}</span>
                      <span className="text-xs text-faint">{timeAgo(a.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong hover:bg-panel-2"
          >
            <Icon name={q.icon} className="mb-3 text-muted group-hover:text-accent" />
            <div className="text-sm font-medium">{q.label}</div>
            <div className="mt-0.5 text-xs text-faint">{q.desc}</div>
          </Link>
        ))}
      </div>
    </>
  )
}
