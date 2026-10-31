import { useMemo, useState } from 'react'
import { BarChart, ChartLegend, DonutChart, LineChart, SERIES } from '../components/charts'
import { CategoryIcon, Disclaimer, KpiCard, SectionTitle } from '../components/common'
import { Badge, Button, Card, EmptyState, Icon, ProgressBar, cx } from '../components/ui'
import { CATEGORY_MAP, categoryLabel } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import { Link } from '../lib/router'
import { buildDashboard } from '../services'
import { inr, inrCompact, inrPrecise, pct } from '../utils/currency'
import { daysUntil, formatDate, greeting, monthLabel, monthShort } from '../utils/dates'
import { pctChange } from '../utils/finance'

function HealthRing({ score }: { score: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  const color = score >= 80 ? 'var(--color-ok)' : score >= 65 ? 'var(--color-accent)' : score >= 45 ? 'var(--color-warn)' : 'var(--color-danger)'
  return (
    <div className="relative grid size-28 shrink-0 place-items-center">
      <svg width="112" height="112" className="-rotate-90" aria-hidden="true">
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--color-hover)" strokeWidth="9" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="num text-3xl leading-none font-semibold">{score}</div>
        <div className="mt-1 text-[10px] text-faint">of 100</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, month, alerts } = useFinanceData()
  const d = useMemo(() => buildDashboard(data, month), [data, month])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const { summary, previous } = d
  const firstName = data.profile.name.split(' ')[0] || 'there'
  const insights = buildInsights(d)
  const topAlerts = alerts.filter((a) => !a.read && a.type !== 'upcoming_payment').slice(0, 3)

  if (summary.transactionCount === 0) {
    return (
      <EmptyState
        icon="receipt"
        title={`No transactions in ${monthLabel(month)}`}
        description="Add transactions manually or import a CSV / SMS to see your dashboard."
        action={
          <Link to="/transactions">
            <Button variant="primary" icon="plus">
              Add transactions
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {greeting()}, {firstName}
          </p>
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
            You saved <span className="text-accent">{inr(summary.savings)}</span> in {monthLabel(month)}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link to="/coach">
            <Button icon="sparkles">Ask the coach</Button>
          </Link>
          <Link to="/transactions">
            <Button variant="primary" icon="plus">
              Add transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Monthly income" icon="briefcase" value={inr(summary.income)} delta={previous.income ? pctChange(summary.income, previous.income) : null} deltaGood="up" hint={`vs ${monthShort(previous.month)}`} />
        <KpiCard label="Monthly expenses" icon="receipt" value={inr(summary.expenses)} delta={previous.expenses ? pctChange(summary.expenses, previous.expenses) : null} deltaGood="down" hint={`vs ${monthShort(previous.month)}`}>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-faint">
              <span>Budget used</span>
              <span className="num">
                {pct(d.budget.utilization)} of {inrCompact(d.budget.budget)}
              </span>
            </div>
            <ProgressBar value={d.budget.utilization} tone={d.budget.utilization > 100 ? 'danger' : d.budget.utilization > 90 ? 'warn' : 'accent'} />
          </div>
        </KpiCard>
        <KpiCard accent label="Net savings" icon="piggyBank" value={inr(summary.savings)} hint={<span>Savings rate <b className="num font-semibold text-fg">{pct(summary.savingsRate, 1)}</b> · target {data.profile.preferences.savingsRateTarget}%</span>} />
        <KpiCard label="Emergency fund" icon="shield" value={inr(data.profile.emergencyFund)} hint={`${d.emergency.monthsCovered.toFixed(1)} of ${data.profile.preferences.emergencyFundMonths} months covered`}>
          <ProgressBar value={d.emergency.progress} tone={d.emergency.progress >= 100 ? 'ok' : 'accent'} />
        </KpiCard>
      </div>

      {/* Income vs expense + health */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Income vs expenses" subtitle="Last 6 months" action={<ChartLegend items={[{ label: 'Income', color: SERIES.income, shape: 'square' }, { label: 'Expenses', color: SERIES.expenses, shape: 'square' }]} />} />
          <BarChart
            ariaLabel="Monthly income and expenses for the last six months"
            data={d.trend.map((m) => ({ label: monthShort(m.month), title: monthLabel(m.month), values: { income: m.income, expenses: m.expenses } }))}
            series={[
              { key: 'income', name: 'Income', color: SERIES.income },
              { key: 'expenses', name: 'Expenses', color: SERIES.expenses },
            ]}
            format={inr}
            axisFormat={inrCompact}
            height={300}
          />
        </Card>

        <Card className="flex flex-col">
          <SectionTitle title="Financial health" subtitle="Calculated from your own data · not a credit score" icon="shield" />
          <div className="flex items-center gap-5">
            <HealthRing score={d.health.score} />
            <div>
              <Badge tone={d.health.score >= 65 ? 'ok' : d.health.score >= 45 ? 'warn' : 'danger'} dot>
                {d.health.grade}
              </Badge>
              <p className="mt-2 text-xs leading-relaxed text-muted">Weighted on savings, emergency cover, budget discipline, goals and fixed costs.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5">
            {d.health.factors.map((f) => (
              <li key={f.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-fg/90">{f.label}</span>
                  <span className="num text-faint">
                    {f.score}/{f.max}
                  </span>
                </div>
                <ProgressBar value={(f.score / f.max) * 100} tone={f.score / f.max >= 0.75 ? 'ok' : f.score / f.max >= 0.4 ? 'warn' : 'danger'} className="h-1" />
                <div className="mt-0.5 text-[11px] text-faint">{f.detail}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Spending trend + categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="Spending this month"
            subtitle="Cumulative, compared with last month"
            action={<ChartLegend items={[{ label: monthShort(month), color: SERIES.expenses }, { label: monthShort(previous.month), color: SERIES.previous, dashed: true }]} />}
          />
          <LineChart
            ariaLabel="Cumulative spending by day this month versus last month"
            data={d.daily.map((p, i) => ({ label: String(p.day), title: `Day ${p.day}`, values: { now: p.total, prev: d.dailyPrevious[i]?.total ?? null } }))}
            series={[
              { key: 'now', name: monthShort(month), color: SERIES.expenses, area: true },
              { key: 'prev', name: monthShort(previous.month), color: SERIES.previous, dashed: true },
            ]}
            format={inr}
            axisFormat={inrCompact}
            labelEvery={5}
            height={230}
          />
        </Card>

        <Card>
          <SectionTitle title="Where your money went" subtitle={`${inr(summary.expenses)} across ${d.categories.length} categories`} action={<Link to="/analytics" className="text-xs text-muted hover:text-fg">Analytics →</Link>} />
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <DonutChart
              ariaLabel="Expense breakdown by category"
              segments={d.categories.map((c) => ({ key: c.category, label: categoryLabel(c.category), value: c.amount, color: CATEGORY_MAP[c.category].color }))}
              format={inr}
              activeKey={activeCat}
              onActiveChange={setActiveCat}
              center={
                <>
                  <div className="text-[11px] text-muted">Spent</div>
                  <div className="num text-base font-semibold">{inrCompact(summary.expenses)}</div>
                </>
              }
            />
            <ul className="w-full flex-1 space-y-1">
              {d.categories.slice(0, 7).map((c) => (
                <li key={c.category} onMouseEnter={() => setActiveCat(c.category)} onMouseLeave={() => setActiveCat(null)} className={cx('flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors', activeCat === c.category && 'bg-hover')}>
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: CATEGORY_MAP[c.category].color }} />
                  <span className="flex-1 truncate text-fg/90">{categoryLabel(c.category)}</span>
                  <span className="num text-xs text-faint">{pct(c.share)}</span>
                  <span className="num w-20 text-right font-medium">{inr(c.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Insights / alerts / upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-violet/20">
          <SectionTitle
            title="Coach insights"
            icon="sparkles"
            subtitle="Rule-based, from your data"
            action={<Badge tone="violet">Demo</Badge>}
          />
          <ul className="space-y-3">
            {insights.map((i, idx) => (
              <li key={idx} className="flex gap-2.5 text-sm">
                <Icon name={i.icon} size={15} className={cx('mt-0.5 shrink-0', i.tone === 'ok' ? 'text-ok' : i.tone === 'warn' ? 'text-warn' : 'text-violet')} />
                <span className="leading-relaxed text-fg/90">{i.text}</span>
              </li>
            ))}
          </ul>
          <Link to="/coach" className="mt-4 inline-flex items-center gap-1 text-xs text-violet hover:underline">
            Ask a follow-up <Icon name="arrowRight" size={12} />
          </Link>
        </Card>

        <Card>
          <SectionTitle title="Spending alerts" icon="bell" action={<Link to="/alerts" className="text-xs text-muted hover:text-fg">All →</Link>} />
          {topAlerts.length === 0 ? (
            <p className="text-sm text-muted">No unread spending alerts. Nice.</p>
          ) : (
            <ul className="space-y-3">
              {topAlerts.map((a) => (
                <li key={a.id} className="rounded-lg border border-line bg-panel-2 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={cx('size-1.5 shrink-0 rounded-full', a.severity === 'high' ? 'bg-danger' : a.severity === 'medium' ? 'bg-warn' : 'bg-info')} />
                    {a.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle title="Upcoming payments" icon="calendar" subtitle={`${inr(d.recurring.monthly)}/month recurring`} action={<Link to="/subscriptions" className="text-xs text-muted hover:text-fg">Manage →</Link>} />
          <ul className="space-y-1">
            {d.upcoming.slice(0, 5).map(({ sub, next }) => {
              const days = daysUntil(next)
              return (
                <li key={sub.id} className="flex items-center gap-3 rounded-md py-1.5">
                  <CategoryIcon category={sub.category} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{sub.name}</span>
                    <span className="text-[11px] text-faint">{formatDate(next)}</span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-sm font-medium">{inr(sub.amount)}</span>
                    <span className={cx('text-[11px]', days <= 3 ? 'text-warn' : 'text-faint')}>{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days}d`}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {/* Recent transactions + goals */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="p-5 pb-2">
            <SectionTitle title="Recent transactions" action={<Link to="/transactions" className="text-xs text-muted hover:text-fg">View all →</Link>} />
          </div>
          <ul className="divide-y divide-line">
            {d.recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <CategoryIcon category={t.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{t.description}</span>
                  <span className="text-xs text-faint">
                    {formatDate(t.date)} · {categoryLabel(t.category)} · {t.paymentMethod}
                  </span>
                </span>
                <span className={cx('num text-sm font-medium', t.type === 'income' ? 'text-ok' : 'text-fg')}>
                  {t.type === 'income' ? '+' : '−'}
                  {inrPrecise(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Savings goals" icon="target" action={<Link to="/goals" className="text-xs text-muted hover:text-fg">Plan →</Link>} />
          {d.goals.length === 0 ? (
            <p className="text-sm text-muted">No goals yet.</p>
          ) : (
            <ul className="space-y-4">
              {d.goals.slice(0, 4).map((g) => (
                <li key={g.goal.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{g.goal.name}</span>
                    <span className="num text-xs text-faint">{pct(g.progress)}</span>
                  </div>
                  <ProgressBar value={g.progress} tone={g.onTrack ? 'accent' : 'warn'} />
                  <div className="mt-1 flex justify-between text-[11px] text-faint">
                    <span className="num">
                      {inrCompact(g.goal.savedAmount)} of {inrCompact(g.goal.targetAmount)}
                    </span>
                    <span className={g.onTrack ? '' : 'text-warn'}>{g.onTrack ? 'On track' : 'Behind'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Disclaimer />
    </div>
  )
}

type Insight = { icon: 'trendingUp' | 'trendingDown' | 'sparkles' | 'alert'; tone: 'ok' | 'warn' | 'info'; text: string }

function buildInsights(d: ReturnType<typeof buildDashboard>): Insight[] {
  const out: Insight[] = []
  const top = d.categories.find((c) => c.category !== 'housing')
  if (top) out.push({ icon: 'sparkles', tone: 'info', text: `${categoryLabel(top.category)} is your biggest flexible expense at ${inr(top.amount)} (${pct(top.share)} of spending).` })
  const over = d.budget.rows.find((r) => r.budget > 0 && r.spent > r.budget)
  if (over) {
    const cut = (over.spent - over.budget) / over.spent
    out.push({ icon: 'alert', tone: 'warn', text: `${categoryLabel(over.category)} is ${inr(over.spent - over.budget)} over budget. A ${Math.ceil(cut * 100)}% cut gets you back on plan.` })
  }
  if (d.previous.expenses > 0) {
    const ch = pctChange(d.summary.expenses, d.previous.expenses)
    out.push({ icon: ch > 0 ? 'trendingUp' : 'trendingDown', tone: ch > 0 ? 'warn' : 'ok', text: `Spending is ${ch > 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(1)}% from last month.` })
  }
  if (d.emergency.shortfall > 0) out.push({ icon: 'sparkles', tone: 'info', text: `${inr(d.emergency.shortfall)} more fully funds your emergency cushion.` })
  return out.slice(0, 4)
}
