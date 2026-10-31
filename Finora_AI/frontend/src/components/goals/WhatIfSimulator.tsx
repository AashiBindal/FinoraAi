// Interactive what-if simulator. Every output is computed live from the
// user's data with utils/finance.ts - nothing is precomputed.

import { useMemo, useState } from 'react'
import { categoryLabel, EXPENSE_CATEGORIES } from '../../data/categories'
import type { CategoryId, FinanceSnapshot, MonthKey } from '../../types/finance'
import { inr, inrSigned, pct } from '../../utils/currency'
import { formatDate, monthLabel } from '../../utils/dates'
import { averageCategorySpend, goalProgress, simulateCategoryCut, simulateExpenseChange, summarizeMonth } from '../../utils/finance'
import { Segmented } from '../common'
import { Card, Field, Icon, Input, Select, cx } from '../ui'

function Result({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <div className="text-[11px] text-faint">{label}</div>
      <div className={cx('num mt-1 text-lg font-semibold', tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-fg')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </div>
  )
}

function Slider({ value, onChange, min, max, step, label, format }: { value: number; onChange: (n: number) => void; min: number; max: number; step: number; label: string; format: (n: number) => string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num rounded-md bg-accent-soft px-2 py-0.5 font-semibold text-accent">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full cursor-pointer" aria-label={label} />
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

const fmtMonth = (d: string | null) => (d ? formatDate(d, { month: 'short', year: 'numeric' }) : 'Not reachable')

export function WhatIfSimulator({ data, month }: { data: FinanceSnapshot; month: MonthKey }) {
  const [mode, setMode] = useState<'cut' | 'change'>('cut')
  const [category, setCategory] = useState<CategoryId>('food')
  const [cutPct, setCutPct] = useState(30)
  const [base, setBase] = useState<'avg' | 'month'>('avg')
  const [change, setChange] = useState(3000)
  const [changeLabel, setChangeLabel] = useState('Rent')
  const activeGoals = data.goals.filter((g) => goalProgress(g).remaining > 0)
  const [goalId, setGoalId] = useState(activeGoals[0]?.id ?? '')
  const goal = data.goals.find((g) => g.id === goalId) ?? activeGoals[0]

  const summary = useMemo(() => summarizeMonth(data.transactions, month), [data.transactions, month])
  const current = base === 'avg' ? averageCategorySpend(data.transactions, category, month, 3) : (summary.byCategory[category] ?? 0)
  const cut = simulateCategoryCut(current, cutPct)
  const ch = simulateExpenseChange({ income: summary.income, expenses: summary.expenses, change })

  // Goal impact: the saving (or extra cost) flows into/out of the chosen goal's contribution
  const extra = mode === 'cut' ? cut.monthlySaving : -change
  const before = goal ? goalProgress(goal) : null
  const after = goal ? goalProgress(goal, Math.max(-goal.monthlyContribution, extra)) : null
  const monthsDelta = before && after && Number.isFinite(before.monthsToComplete) && Number.isFinite(after.monthsToComplete) ? before.monthsToComplete - after.monthsToComplete : null

  return (
    <Card className="border-violet/20">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="sliders" size={16} className="text-violet" /> What-if simulator
          </h2>
          <p className="mt-0.5 text-xs text-muted">Move the sliders - results recalculate from your own numbers.</p>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'cut', label: 'Reduce a category' },
            { value: 'change', label: 'Cost changes' },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5">
          {mode === 'cut' ? (
            <>
              <p className="rounded-lg bg-panel-2 px-3 py-2 text-sm text-fg/90">
                “What if I reduce <b>{categoryLabel(category).toLowerCase()}</b> expenses by <b>{cutPct}%</b>?”
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
                    {EXPENSE_CATEGORIES.filter((c) => c.id !== 'investments').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Based on">
                  <Select value={base} onChange={(e) => setBase(e.target.value as 'avg' | 'month')}>
                    <option value="avg">3-month average</option>
                    <option value="month">{monthLabel(month)}</option>
                  </Select>
                </Field>
              </div>
              <Slider label="Reduction" value={cutPct} onChange={setCutPct} min={0} max={80} step={5} format={(n) => `${n}%`} />
              <Field label="Or type a percentage">
                <Input type="number" min={0} max={100} value={cutPct} onChange={(e) => setCutPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              </Field>
            </>
          ) : (
            <>
              <p className="rounded-lg bg-panel-2 px-3 py-2 text-sm text-fg/90">
                “What if my <b>{changeLabel.toLowerCase() || 'costs'}</b> {change >= 0 ? 'increases' : 'decreases'} by <b>{inr(Math.abs(change))}</b>?”
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['Rent', 3000],
                  ['EMI', 8000],
                  ['Electricity', 800],
                  ['Rent', -2000],
                ].map(([l, v]) => (
                  <button
                    key={`${l}${v}`}
                    onClick={() => {
                      setChangeLabel(String(l))
                      setChange(Number(v))
                    }}
                    className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    {l} {Number(v) >= 0 ? '+' : '−'}
                    {inr(Math.abs(Number(v)))}
                  </button>
                ))}
              </div>
              <Field label="What changes?">
                <Input value={changeLabel} onChange={(e) => setChangeLabel(e.target.value)} maxLength={30} />
              </Field>
              <Slider label="Monthly change" value={change} onChange={setChange} min={-10000} max={15000} step={500} format={inrSigned} />
              <Field label="Or type an amount (₹, negative = saving)">
                <Input type="number" step={100} value={change} onChange={(e) => setChange(Math.max(-1e6, Math.min(1e6, Number(e.target.value) || 0)))} />
              </Field>
            </>
          )}
          {data.goals.length > 0 && (
            <Field label="See the impact on goal">
              <Select value={goal?.id ?? ''} onChange={(e) => setGoalId(e.target.value)}>
                {data.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="space-y-4">
          {mode === 'cut' ? (
            <div className="grid grid-cols-2 gap-3">
              <Result label={`Current monthly ${categoryLabel(category).toLowerCase()}`} value={inr(current)} sub={base === 'avg' ? '3-month average' : monthLabel(month)} />
              <Result label="New monthly expense" value={inr(cut.newMonthly)} sub={`−${cutPct}%`} />
              <Result label="Monthly savings" value={inr(cut.monthlySaving)} tone="ok" />
              <Result label="Annual savings" value={inr(cut.annualSaving)} tone="ok" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Result label="Disposable income today" value={inr(ch.disposableBefore)} sub={`Income ${inr(summary.income)} − spend ${inr(summary.expenses)}`} />
              <Result label="Disposable income after" value={inr(ch.disposableAfter)} tone={ch.disposableAfter < 0 ? 'danger' : change > 0 ? 'warn' : 'ok'} sub={`${inrSigned(-change)} per month`} />
              <Result label="Savings rate" value={`${pct(ch.savingsRateBefore, 1)} → ${pct(ch.savingsRateAfter, 1)}`} tone={ch.savingsRateAfter < data.profile.preferences.savingsRateTarget ? 'warn' : 'ok'} sub={`Target ${data.profile.preferences.savingsRateTarget}%`} />
              <Result label="Yearly impact" value={inrSigned(-ch.annualImpact)} tone={change > 0 ? 'warn' : 'ok'} />
            </div>
          )}

          {goal && before && after && (
            <div className="rounded-xl border border-line p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Icon name="target" size={15} className="text-accent" /> Estimated completion · {goal.name}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <div>
                  <div className="text-[11px] text-faint">Today’s plan</div>
                  <div className="num mt-0.5 font-semibold">{fmtMonth(before.projectedDate)}</div>
                  <div className="num text-[11px] text-faint">{inr(goal.monthlyContribution)}/mo</div>
                </div>
                <Icon name="arrowRight" size={16} className="text-faint" />
                <div>
                  <div className="text-[11px] text-faint">With this change</div>
                  <div className={cx('num mt-0.5 font-semibold', monthsDelta != null && monthsDelta > 0 ? 'text-ok' : monthsDelta != null && monthsDelta < 0 ? 'text-warn' : '')}>{fmtMonth(after.projectedDate)}</div>
                  <div className="num text-[11px] text-faint">{inr(Math.max(0, goal.monthlyContribution + extra))}/mo</div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                {monthsDelta == null
                  ? 'With no contribution left, this goal would not be reached.'
                  : monthsDelta === 0
                    ? 'No change to the finish month.'
                    : `${Math.abs(monthsDelta)} month${Math.abs(monthsDelta) === 1 ? '' : 's'} ${monthsDelta > 0 ? 'sooner' : 'later'} · target ${formatDate(goal.targetDate, { month: 'short', year: 'numeric' })}`}
              </p>
            </div>
          )}
          <p className="text-[11px] text-faint">Assumes the difference goes to (or comes out of) this goal’s monthly contribution. Estimates only - not financial advice.</p>
        </div>
      </div>
    </Card>
  )
}
