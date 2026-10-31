import { useMemo, type ReactNode } from 'react'
import { Disclaimer, SampleBadge } from '../components/common'
import { Button, Card, Icon, cx } from '../components/ui'
import { CATEGORY_MAP, categoryLabel } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import { buildReport } from '../services'
import { inr, inrSigned, pct } from '../utils/currency'
import { formatDate, formatDateLong, monthLabel } from '../utils/dates'
import { monthlyEquivalent, nextPayment, pctChange } from '../utils/finance'

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('print-break', className)}>
      <h3 className="mb-3 text-xs font-semibold tracking-[0.08em] text-faint uppercase">{title}</h3>
      {children}
    </section>
  )
}

export default function MonthlyReport() {
  const { data, month, hasSampleData } = useFinanceData()
  const r = useMemo(() => buildReport(data, month), [data, month])
  const s = r.summary
  const ch = r.previous.expenses ? pctChange(s.expenses, r.previous.expenses) : null

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted">A one-page summary of {monthLabel(month)}. Change the month from the top bar.</p>
        <div className="flex gap-2">
          <Button icon="printer" variant="primary" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <Card padded={false} className="print-root space-y-8 p-6 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wider text-accent uppercase">
              <Icon name="file" size={13} /> Finora AI · Monthly report
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{monthLabel(month)}</h2>
            <p className="mt-1 text-sm text-muted">Prepared for {data.profile.name || 'you'} · generated {formatDateLong(r.generatedAt.slice(0, 10))}</p>
          </div>
          {hasSampleData && <SampleBadge label="Contains sample data" />}
        </header>

        <Section title="Summary">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Total income', inr(s.income), null],
              ['Total expenditure', inr(s.expenses), ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(1)}% vs last month` : null],
              ['Total savings', inr(s.savings), null],
              ['Savings rate', pct(s.savingsRate, 1), `Target ${data.profile.preferences.savingsRateTarget}%`],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl border border-line px-4 py-3">
                <div className="text-[11px] text-faint">{k}</div>
                <div className="num mt-1 text-xl font-semibold">{v}</div>
                {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-8 md:grid-cols-2">
          <Section title="Where the money went">
            {r.biggest && (
              <p className="mb-3 text-sm">
                Biggest category: <b className="font-semibold">{categoryLabel(r.biggest.category)}</b> at {inr(r.biggest.amount)} ({pct(r.biggest.share)}).
              </p>
            )}
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {r.categories.map((c) => (
                  <tr key={c.category}>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: CATEGORY_MAP[c.category].color }} />
                        {categoryLabel(c.category)}
                      </span>
                    </td>
                    <td className="num py-1.5 text-right text-muted">{pct(c.share, 1)}</td>
                    <td className="num py-1.5 text-right font-medium">{inr(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Observations">
            <ul className="space-y-2.5">
              {r.observations.map((o, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <Icon name={o.tone === 'ok' ? 'check' : o.tone === 'warn' ? 'alert' : 'info'} size={14} className={cx('mt-1 shrink-0', o.tone === 'ok' ? 'text-ok' : o.tone === 'warn' ? 'text-warn' : 'text-info')} />
                  {o.text}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Section title={`Recurring payments · ${inr(r.recurring.monthly)}/month`}>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {r.subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-1.5">{sub.name}</td>
                    <td className="py-1.5 text-right text-xs text-faint">next {formatDate(nextPayment(sub))}</td>
                    <td className="num py-1.5 text-right font-medium">{inr(monthlyEquivalent(sub))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">≈ {inr(r.recurring.yearly)} per year across {r.recurring.activeCount} active subscriptions.</p>
          </Section>

          <Section title="Goal progress">
            <ul className="space-y-3">
              {r.goals.map((g) => (
                <li key={g.goal.id} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{g.goal.name}</span>
                    <span className="num text-muted">
                      {inr(g.goal.savedAmount)} / {inr(g.goal.targetAmount)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover">
                    <div className={cx('h-full rounded-full', g.onTrack ? 'bg-accent' : 'bg-warn')} style={{ width: `${g.progress}%` }} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-faint">
                    {pct(g.progress)} · {g.onTrack ? 'on track' : `needs ${inr(g.requiredMonthly)}/month to finish by ${formatDate(g.goal.targetDate, { month: 'short', year: 'numeric' })}`}
                  </div>
                </li>
              ))}
              <li className="text-sm">
                <div className="flex justify-between gap-2">
                  <span>Emergency fund</span>
                  <span className="num text-muted">{r.emergency.monthsCovered.toFixed(1)} months covered</span>
                </div>
              </li>
            </ul>
          </Section>
        </div>

        <Section title={`Suggested budget for ${monthLabel(addOne(month))}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-[11px] text-faint">
                <tr className="border-b border-line">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">This month’s budget</th>
                  <th className="pb-2 text-right font-medium">3-mo average</th>
                  <th className="pb-2 text-right font-medium">Suggested</th>
                  <th className="pb-2 pl-4 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.suggested.map((row) => (
                  <tr key={row.category}>
                    <td className="py-1.5">{categoryLabel(row.category)}</td>
                    <td className="num py-1.5 text-right text-muted">{inr(row.current)}</td>
                    <td className="num py-1.5 text-right text-muted">{inr(row.avg)}</td>
                    <td className={cx('num py-1.5 text-right font-medium', row.next !== row.current && 'text-accent')}>
                      {inr(row.next)}
                      {row.next !== row.current && <span className="ml-1 text-[10px] text-faint">({inrSigned(row.next - row.current)})</span>}
                    </td>
                    <td className="py-1.5 pl-4 text-xs text-muted">{row.reason}</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="pt-2">Total</td>
                  <td className="num pt-2 text-right">{inr(r.suggested.reduce((t, x) => t + x.current, 0))}</td>
                  <td />
                  <td className="num pt-2 text-right">{inr(r.suggestedTotal)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Rule-based suggestion from your budgets and 3-month averages. Adjust it in Money Profile.</p>
        </Section>

        <footer className="border-t border-line pt-5">
          <Disclaimer />
        </footer>
      </Card>
      <p className="text-center text-[11px] text-faint print:hidden">Tip: in the print dialog choose “Save as PDF”. A server-generated PDF export can be added with the backend later.</p>
    </div>
  )
}

const addOne = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}
