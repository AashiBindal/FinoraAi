import { useMemo, useState } from 'react'
import { Segmented } from '../components/common'
import { Badge, Button, Card, EmptyState, Icon, Select, cx, type IconName } from '../components/ui'
import { useFinanceData } from '../hooks/useFinance'
import { useRouter } from '../lib/router'
import type { AlertSeverity, AlertType, FinanceAlert } from '../types/finance'
import { formatDateLong, monthLabel } from '../utils/dates'

export const ALERT_TYPE: Record<AlertType, { label: string; icon: IconName }> = {
  overspending: { label: 'Overspending', icon: 'trendingUp' },
  budget_utilization: { label: 'Budget', icon: 'sliders' },
  bill_increase: { label: 'Bill increase', icon: 'zap' },
  goal_behind: { label: 'Goal', icon: 'target' },
  upcoming_payment: { label: 'Upcoming payment', icon: 'calendar' },
  low_savings: { label: 'Savings', icon: 'piggyBank' },
  price_increase: { label: 'Price increase', icon: 'repeat' },
  unused_subscription: { label: 'Subscription', icon: 'repeat' },
}
const SEVERITY: Record<AlertSeverity, { label: string; tone: 'danger' | 'warn' | 'info' | 'neutral'; bar: string }> = {
  high: { label: 'High', tone: 'danger', bar: 'bg-danger' },
  medium: { label: 'Medium', tone: 'warn', bar: 'bg-warn' },
  low: { label: 'Low', tone: 'info', bar: 'bg-info' },
  info: { label: 'Info', tone: 'neutral', bar: 'bg-faint' },
}

function AlertRow({ alert, onToggle, onAction }: { alert: FinanceAlert; onToggle: () => void; onAction: () => void }) {
  const meta = ALERT_TYPE[alert.type]
  return (
    <li className={cx('relative flex gap-4 overflow-hidden rounded-xl border p-4 pl-5 transition-colors sm:p-5 sm:pl-6', alert.read ? 'border-line bg-panel/60' : 'border-line-strong bg-panel')}>
      <span className={cx('absolute inset-y-0 left-0 w-1', SEVERITY[alert.severity].bar, alert.read && 'opacity-40')} />
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg', alert.read ? 'bg-hover text-faint' : 'bg-panel-2 text-fg')}>
        <Icon name={meta.icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {!alert.read && <span className="size-2 rounded-full bg-accent" aria-label="Unread" />}
          <h3 className={cx('text-sm', alert.read ? 'text-muted' : 'font-semibold text-fg')}>{alert.title}</h3>
          <Badge tone={SEVERITY[alert.severity].tone}>{SEVERITY[alert.severity].label}</Badge>
          <Badge>{meta.label}</Badge>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{alert.description}</p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-panel-2 px-3 py-2 text-xs text-fg/90">
          <Icon name="lightbulb" size={13} className="mt-0.5 shrink-0 text-accent" />
          <span>
            <span className="font-medium">Suggested action: </span>
            {alert.suggestedAction}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {alert.actionHref && (
            <Button size="sm" onClick={onAction}>
              Take a look
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={alert.read ? 'circle' : 'check'} onClick={onToggle}>
            Mark as {alert.read ? 'unread' : 'read'}
          </Button>
          <span className="ml-auto text-[11px] text-faint">{formatDateLong(alert.date)}</span>
        </div>
      </div>
    </li>
  )
}

export default function SmartAlerts() {
  const { alerts, setAlertsRead, month } = useFinanceData()
  const { navigate } = useRouter()
  const [view, setView] = useState<'all' | 'unread' | 'read'>('all')
  const [severity, setSeverity] = useState<'all' | AlertSeverity>('all')

  const list = useMemo(
    () => alerts.filter((a) => (view === 'all' || (view === 'unread' ? !a.read : a.read)) && (severity === 'all' || a.severity === severity)),
    [alerts, view, severity],
  )
  const unread = alerts.filter((a) => !a.read)
  const counts = (['high', 'medium', 'low', 'info'] as AlertSeverity[]).map((s) => ({ s, n: unread.filter((a) => a.severity === s).length }))

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="flex flex-wrap items-center gap-5">
        <div className="flex-1">
          <div className="text-sm text-muted">Unread alerts · {monthLabel(month)}</div>
          <div className="num mt-1 text-3xl font-semibold">{unread.length}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {counts.map(({ s, n }) => (
            <Badge key={s} tone={SEVERITY[s].tone} dot>
              {n} {SEVERITY[s].label.toLowerCase()}
            </Badge>
          ))}
        </div>
        <Button icon="check" disabled={!unread.length} onClick={() => setAlertsRead(unread.map((a) => a.id), true)}>
          Mark all read
        </Button>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: `All (${alerts.length})` },
            { value: 'unread', label: `Unread (${unread.length})` },
            { value: 'read', label: 'Read' },
          ]}
        />
        <Select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity | 'all')} className="w-auto" aria-label="Severity filter">
          <option value="all">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="bell" title={view === 'unread' ? "You're all caught up" : 'No alerts here'} description="Alerts are recalculated whenever your transactions, budgets, goals or subscriptions change." />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              onToggle={() => setAlertsRead([a.id], !a.read)}
              onAction={() => {
                void setAlertsRead([a.id], true)
                if (a.actionHref) navigate(a.actionHref)
              }}
            />
          ))}
        </ul>
      )}
      <p className="text-center text-[11px] text-faint">
        Alerts are transparent rules over your data (budgets, bill changes, goal timelines, renewals) - calculated in your browser. Turn types on or off in Settings.
      </p>
    </div>
  )
}
