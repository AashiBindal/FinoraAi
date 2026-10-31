import { useEffect, useMemo, useState } from 'react'
import { BarChart, ChartLegend, DonutChart, LineChart, SERIES } from '../components/charts'
import { CategoryIcon, KpiCard, SectionTitle, Segmented } from '../components/common'
import { Card, EmptyState, Select, cx } from '../components/ui'
import { CATEGORY_MAP, categoryLabel, EXPENSE_CATEGORIES } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import { buildAnalytics } from '../services'
import type { CategoryId } from '../types/finance'
import { inr, inrCompact, inrSigned, pct } from '../utils/currency'
import { addMonths, monthLabel, monthShort } from '../utils/dates'

type Range = '3' | '6' | '12' | 'custom'

export default function Analytics() {
  const { data, month, months } = useFinanceData()
  const [range, setRange] = useState<Range>('6')
  const [from, setFrom] = useState(months[0])
  const [to, setTo] = useState(month)
  const [trendCat, setTrendCat] = useState<CategoryId>('food')
  const [activeCat, setActiveCat] = useState<string | null>(null)

  useEffect(() => setTo(month), [month])
  const [start, end] = range === 'custom' ? ([from <= to ? from : to, from <= to ? to : from] as const) : ([addMonths(month, -(Number(range) - 1)), month] as const)
  const a = useMemo(() => buildAnalytics(data, start, end), [data, start, end])
  const hasData = a.series.some((m) => m.transactionCount > 0)
  const monthsLabel = `${monthLabel(start, 'short')} – ${monthLabel(end, 'short')}`
  const avgExpense = a.totals.avgMonthlyExpense

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '3', label: '3M' },
            { value: '6', label: '6M' },
            { value: '12', label: '12M' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {range === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <Select value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="From month">
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m, 'short')}
                </option>
              ))}
            </Select>
            <span className="text-faint">to</span>
            <Select value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label="To month">
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m, 'short')}
                </option>
              ))}
            </Select>
          </div>
        )}
        <span className="text-xs text-faint">{monthsLabel} · {a.months.length} months</span>
      </div>

      {!hasData ? (
        <EmptyState icon="lineChart" title="No data in this range" description="Pick a different range or add transactions." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total income" icon="briefcase" value={inr(a.totals.income)} hint={monthsLabel} />
            <KpiCard label="Total spending" icon="receipt" value={inr(a.totals.expenses)} hint={`${inr(avgExpense)} / month avg`} />
            <KpiCard accent label="Total saved" icon="piggyBank" value={inr(a.totals.savings)} hint={`${pct(a.totals.savingsRate, 1)} savings rate`} />
            <KpiCard label="Top category" icon="pieChart" value={a.categoryTotals[0] ? categoryLabel(a.categoryTotals[0].category) : '—'} hint={a.categoryTotals[0] ? `${pct(a.categoryTotals[0].share)} of spending` : undefined} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Income vs expenses" subtitle="Monthly totals" action={<ChartLegend items={[{ label: 'Income', color: SERIES.income, shape: 'square' }, { label: 'Expenses', color: SERIES.expenses, shape: 'square' }]} />} />
              <BarChart
                ariaLabel="Monthly income versus expenses"
                data={a.series.map((m) => ({ label: monthShort(m.month), title: monthLabel(m.month), values: { income: m.income, expenses: m.expenses } }))}
                series={[
                  { key: 'income', name: 'Income', color: SERIES.income },
                  { key: 'expenses', name: 'Expenses', color: SERIES.expenses },
                ]}
                format={inr}
                axisFormat={inrCompact}
              />
            </Card>
            <Card>
              <SectionTitle title="Savings trend" subtitle="Income minus expenses each month" />
              <LineChart
                ariaLabel="Monthly savings trend"
                data={a.series.map((m) => ({ label: monthShort(m.month), title: `${monthLabel(m.month)} · ${pct(m.savingsRate, 1)} saved`, values: { savings: m.savings } }))}
                series={[{ key: 'savings', name: 'Savings', color: SERIES.savings, area: true }]}
                format={inr}
                axisFormat={inrCompact}
                minZero={!a.series.some((m) => m.savings < 0)}
                height={240}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Card>
              <SectionTitle title="Category distribution" subtitle={monthsLabel} />
              <div className="flex justify-center">
                <DonutChart
                  ariaLabel="Spending by category"
                  size={200}
                  segments={a.categoryTotals.map((c) => ({ key: c.category, label: categoryLabel(c.category), value: c.amount, color: CATEGORY_MAP[c.category].color }))}
                  format={inr}
                  activeKey={activeCat}
                  onActiveChange={setActiveCat}
                  center={
                    <>
                      <div className="text-[11px] text-muted">Total</div>
                      <div className="num text-base font-semibold">{inrCompact(a.totals.expenses)}</div>
                    </>
                  }
                />
              </div>
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-[11px] text-faint">
                  <tr>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 text-right font-medium">Share</th>
                    <th className="pb-2 text-right font-medium">Avg / mo</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {a.categoryTotals.map((c) => (
                    <tr key={c.category} onMouseEnter={() => setActiveCat(c.category)} onMouseLeave={() => setActiveCat(null)} className={cx('transition-colors', activeCat === c.category && 'bg-hover')}>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-[3px]" style={{ background: CATEGORY_MAP[c.category].color }} />
                          {categoryLabel(c.category)}
                        </span>
                      </td>
                      <td className="num py-2 text-right text-muted">{pct(c.share, 1)}</td>
                      <td className="num py-2 text-right text-muted">{inr(c.monthlyAvg)}</td>
                      <td className="num py-2 text-right font-medium">{inr(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="space-y-4">
              <Card>
                <SectionTitle
                  title="Category over time"
                  subtitle="Monthly spend with the range average"
                  action={
                    <Select value={trendCat} onChange={(e) => setTrendCat(e.target.value as CategoryId)} className="h-8 w-auto text-xs" aria-label="Category">
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  }
                />
                {(() => {
                  const vals = a.series.map((m) => m.byCategory[trendCat] ?? 0)
                  const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
                  return (
                    <>
                      <ChartLegend items={[{ label: categoryLabel(trendCat), color: CATEGORY_MAP[trendCat].color }, { label: 'Average', color: SERIES.previous, dashed: true }]} />
                      <div className="mt-2">
                        <LineChart
                          ariaLabel={`${categoryLabel(trendCat)} spending by month`}
                          data={a.series.map((m, i) => ({ label: monthShort(m.month), title: monthLabel(m.month), values: { v: vals[i], avg } }))}
                          series={[
                            { key: 'v', name: categoryLabel(trendCat), color: CATEGORY_MAP[trendCat].color, area: true },
                            { key: 'avg', name: 'Average', color: SERIES.previous, dashed: true },
                          ]}
                          format={inr}
                          axisFormat={inrCompact}
                          height={200}
                        />
                      </div>
                    </>
                  )
                })()}
              </Card>

              <Card>
                <SectionTitle title="Budget utilisation" subtitle={`${monthLabel(end)} · ${pct(a.budget.utilization)} of ${inr(a.budget.budget)}`} />
                <ul className="space-y-3">
                  {a.budget.rows.map((r) => {
                    const over = r.budget > 0 && r.spent > r.budget
                    const w = r.budget > 0 ? Math.min(100, (r.spent / Math.max(r.spent, r.budget)) * 100) : 100
                    const mark = r.budget > 0 && over ? (r.budget / r.spent) * 100 : null
                    return (
                      <li key={r.category} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm max-sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto]">
                        <span className="flex items-center gap-2 truncate">
                          <CategoryIcon category={r.category} size="sm" />
                          <span className="truncate">{categoryLabel(r.category)}</span>
                        </span>
                        <div className="relative h-2 rounded-full bg-hover" title={`${inr(r.spent)} of ${inr(r.budget)}`}>
                          <div className={cx('h-full rounded-full', over ? 'bg-danger' : r.utilization >= data.settings.budgetWarningThreshold ? 'bg-warn' : 'bg-accent')} style={{ width: `${w}%` }} />
                          {mark != null && <span className="absolute -top-1 h-4 w-0.5 rounded bg-fg" style={{ left: `${mark}%` }} aria-hidden="true" />}
                        </div>
                        <span className={cx('num w-24 text-right text-xs', over ? 'text-danger' : 'text-muted')}>{r.budget ? pct(r.utilization) : 'no budget'}</span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-[11px] text-faint">White marker = budget limit on over-spent categories.</p>
              </Card>
            </div>
          </div>

          <Card padded={false} className="overflow-hidden">
            <div className="p-5 pb-3">
              <SectionTitle title="Month-over-month" subtitle={`${monthLabel(end)} vs ${monthLabel(addMonths(end, -1))}`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-line text-left text-xs text-faint">
                  <tr>
                    <th className="py-2.5 pl-5 font-medium">Category</th>
                    <th className="py-2.5 text-right font-medium">{monthShort(addMonths(end, -1))}</th>
                    <th className="py-2.5 text-right font-medium">{monthShort(end)}</th>
                    <th className="py-2.5 text-right font-medium">Change</th>
                    <th className="py-2.5 pr-5 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {a.momRows.map((r) => (
                    <tr key={r.category}>
                      <td className="py-2.5 pl-5">{categoryLabel(r.category)}</td>
                      <td className="num py-2.5 text-right text-muted">{inr(r.before)}</td>
                      <td className="num py-2.5 text-right">{inr(r.now)}</td>
                      <td className={cx('num py-2.5 text-right', r.change > 0 ? 'text-danger' : r.change < 0 ? 'text-ok' : 'text-muted')}>{inrSigned(r.change)}</td>
                      <td className={cx('num py-2.5 pr-5 text-right', r.change > 0 ? 'text-danger' : r.change < 0 ? 'text-ok' : 'text-muted')}>
                        {r.before ? `${r.changePct > 0 ? '+' : ''}${r.changePct.toFixed(0)}%` : 'new'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-panel-2/60 font-medium">
                    <td className="py-2.5 pl-5">Total</td>
                    <td className="num py-2.5 text-right">{inr(a.previous.expenses)}</td>
                    <td className="num py-2.5 text-right">{inr(a.current.expenses)}</td>
                    <td className={cx('num py-2.5 text-right', a.current.expenses > a.previous.expenses ? 'text-danger' : 'text-ok')}>{inrSigned(a.current.expenses - a.previous.expenses)}</td>
                    <td className="py-2.5 pr-5" />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
