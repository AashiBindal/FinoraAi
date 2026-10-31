import { useEffect, useMemo, useState } from 'react'
import { CategoryIcon, KeyValue, SampleBadge, SectionTitle, Toggle } from '../components/common'
import { Button, Card, Field, Icon, IconButton, Input, Select, Textarea, useToast, cx } from '../components/ui'
import { EXPENSE_CATEGORIES } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import { newId } from '../services/storage'
import type { CategoryId, FixedExpense, IncomeSource, MoneyProfile as Profile } from '../types/finance'
import { inr, pct } from '../utils/currency'
import { formatDateLong } from '../utils/dates'
import { lastNMonths, summarizeMonths, emergencyFundStatus } from '../utils/finance'

const num = (v: string) => (v === '' ? 0 : Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, '')) || 0)))

function MoneyInput({ value, onChange, label, invalid }: { value: number; onChange: (n: number) => void; label: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-faint">₹</span>
      <Input aria-label={label} inputMode="numeric" value={value ? value.toLocaleString('en-IN') : ''} placeholder="0" onChange={(e) => onChange(num(e.target.value))} className={cx('num pl-7', invalid && 'field-error')} />
    </div>
  )
}

export default function MoneyProfile() {
  const { data, month, saveProfile } = useFinanceData()
  const toast = useToast()
  const [p, setP] = useState<Profile>(data.profile)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => setP(data.profile), [data.profile])
  const dirty = JSON.stringify(p) !== JSON.stringify(data.profile)

  const income = p.incomeSources.reduce((s, i) => s + i.amount, 0)
  const fixed = p.fixedExpenses.reduce((s, f) => s + f.amount, 0)
  const budgetTotal = Object.values(p.variableBudgets).reduce((s, v) => s + (v ?? 0), 0)
  // Category budgets cover all planned spending (fixed costs included)
  const surplus = income - budgetTotal
  const ef = useMemo(() => emergencyFundStatus(p, summarizeMonths(data.transactions, lastNMonths(month, 3))), [p, data.transactions, month])

  const errors = {
    name: !p.name.trim() ? 'Your name is required.' : '',
    income: p.incomeSources.some((i) => !i.name.trim()) ? 'Every income source needs a name.' : '',
    fixed: p.fixedExpenses.some((f) => !f.name.trim()) ? 'Every fixed expense needs a name.' : '',
    email: p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ? 'Enter a valid email.' : '',
    rate: p.preferences.savingsRateTarget < 0 || p.preferences.savingsRateTarget > 90 ? 'Choose 0–90%.' : '',
  }
  const hasErrors = Object.values(errors).some(Boolean)

  async function save() {
    setSubmitted(true)
    if (hasErrors) return toast.error('Please fix the highlighted fields.')
    setSaving(true)
    if (await saveProfile(p)) toast.success('Money profile saved')
    setSaving(false)
  }

  const updIncome = (id: string, patch: Partial<IncomeSource>) => setP({ ...p, incomeSources: p.incomeSources.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const updFixed = (id: string, patch: Partial<FixedExpense>) => setP({ ...p, fixedExpenses: p.fixedExpenses.map((f) => (f.id === id ? { ...f, ...patch } : f)) })
  const prefs = p.preferences
  const setPrefs = (patch: Partial<Profile['preferences']>) => setP({ ...p, preferences: { ...prefs, ...patch } })

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        {/* Personal */}
        <Card>
          <SectionTitle title="About you" icon="user" action={data.profile.isSample ? <SampleBadge label="Sample profile" /> : undefined} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className={submitted && errors.name ? 'field-error' : ''} />
              {submitted && errors.name && <p className="mt-1 text-[11px] text-danger">{errors.name}</p>}
            </Field>
            <Field label="Email">
              <Input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} className={submitted && errors.email ? 'field-error' : ''} />
              {submitted && errors.email && <p className="mt-1 text-[11px] text-danger">{errors.email}</p>}
            </Field>
            <Field label="City">
              <Input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} />
            </Field>
          </div>
        </Card>

        {/* Income */}
        <Card>
          <SectionTitle
            title="Monthly income"
            subtitle="Take-home amounts, after tax"
            icon="briefcase"
            action={
              <Button size="sm" icon="plus" onClick={() => setP({ ...p, incomeSources: [...p.incomeSources, { id: newId('inc'), name: '', amount: 0, kind: 'other' }] })}>
                Add source
              </Button>
            }
          />
          <div className="space-y-2">
            {p.incomeSources.length === 0 && <p className="text-sm text-faint">No income sources yet.</p>}
            {p.incomeSources.map((i) => (
              <div key={i.id} className="grid grid-cols-[minmax(0,1fr)_140px_120px_auto] items-center gap-2 max-sm:grid-cols-2">
                <Input aria-label="Income source name" value={i.name} placeholder="e.g. Salary" onChange={(e) => updIncome(i.id, { name: e.target.value })} className={submitted && !i.name.trim() ? 'field-error' : ''} />
                <MoneyInput label="Monthly amount" value={i.amount} onChange={(amount) => updIncome(i.id, { amount })} />
                <Select aria-label="Income type" value={i.kind} onChange={(e) => updIncome(i.id, { kind: e.target.value as IncomeSource['kind'] })}>
                  <option value="salary">Salary</option>
                  <option value="freelance">Freelance</option>
                  <option value="rental">Rental</option>
                  <option value="other">Other</option>
                </Select>
                <IconButton icon="trash" label="Remove income source" onClick={() => setP({ ...p, incomeSources: p.incomeSources.filter((x) => x.id !== i.id) })} />
              </div>
            ))}
            {submitted && errors.income && <p className="text-[11px] text-danger">{errors.income}</p>}
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-muted">Total monthly income</span>
            <span className="num font-semibold">{inr(income)}</span>
          </div>
        </Card>

        {/* Fixed */}
        <Card>
          <SectionTitle
            title="Fixed monthly expenses"
            subtitle="Payments that are the same every month"
            icon="home"
            action={
              <Button size="sm" icon="plus" onClick={() => setP({ ...p, fixedExpenses: [...p.fixedExpenses, { id: newId('fx'), name: '', amount: 0, category: 'bills' }] })}>
                Add expense
              </Button>
            }
          />
          <div className="space-y-2">
            {p.fixedExpenses.length === 0 && <p className="text-sm text-faint">No fixed expenses yet.</p>}
            {p.fixedExpenses.map((f) => (
              <div key={f.id} className="grid grid-cols-[auto_minmax(0,1fr)_140px_160px_auto] items-center gap-2 max-sm:grid-cols-2">
                <span className="max-sm:hidden">
                  <CategoryIcon category={f.category} size="sm" />
                </span>
                <Input aria-label="Expense name" value={f.name} placeholder="e.g. Rent" onChange={(e) => updFixed(f.id, { name: e.target.value })} className={submitted && !f.name.trim() ? 'field-error' : ''} />
                <MoneyInput label="Monthly amount" value={f.amount} onChange={(amount) => updFixed(f.id, { amount })} />
                <Select aria-label="Category" value={f.category} onChange={(e) => updFixed(f.id, { category: e.target.value as CategoryId })}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <IconButton icon="trash" label="Remove expense" onClick={() => setP({ ...p, fixedExpenses: p.fixedExpenses.filter((x) => x.id !== f.id) })} />
              </div>
            ))}
            {submitted && errors.fixed && <p className="text-[11px] text-danger">{errors.fixed}</p>}
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-muted">Total fixed</span>
            <span className="num font-semibold">{inr(fixed)}</span>
          </div>
        </Card>

        {/* Variable budgets */}
        <Card>
          <SectionTitle title="Monthly budgets by category" subtitle="Covers all planned monthly spending, including fixed costs" icon="sliders" />
          <div className="grid gap-3 sm:grid-cols-2">
            {EXPENSE_CATEGORIES.filter((c) => c.id !== 'investments').map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <CategoryIcon category={c.id} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{c.label}</span>
                <div className="w-36">
                  <MoneyInput label={`${c.label} budget`} value={p.variableBudgets[c.id] ?? 0} onChange={(v) => setP({ ...p, variableBudgets: { ...p.variableBudgets, [c.id]: v } })} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-muted">Total monthly budget</span>
            <span className="num font-semibold">{inr(budgetTotal)}</span>
          </div>
        </Card>

        {/* Savings */}
        <Card>
          <SectionTitle title="Savings & emergency fund" icon="piggyBank" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency fund balance" hint="Money set aside only for emergencies">
              <MoneyInput label="Emergency fund" value={p.emergencyFund} onChange={(emergencyFund) => setP({ ...p, emergencyFund })} />
            </Field>
            <Field label="Other savings balance" hint="Savings account, excluding the emergency fund">
              <MoneyInput label="Savings balance" value={p.savingsBalance} onChange={(savingsBalance) => setP({ ...p, savingsBalance })} />
            </Field>
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <SectionTitle title="Preferences & constraints" subtitle="Personal rules the coach should respect" icon="shield" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Savings-rate target (%)">
              <Input type="number" min={0} max={90} value={prefs.savingsRateTarget} onChange={(e) => setPrefs({ savingsRateTarget: Number(e.target.value) })} className={submitted && errors.rate ? 'field-error' : ''} />
              {submitted && errors.rate && <p className="mt-1 text-[11px] text-danger">{errors.rate}</p>}
            </Field>
            <Field label="Emergency fund target">
              <Select value={prefs.emergencyFundMonths} onChange={(e) => setPrefs({ emergencyFundMonths: Number(e.target.value) })}>
                {[3, 4, 6, 9, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} months of essentials
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Minimum balance to keep">
              <MoneyInput label="Minimum balance" value={prefs.minimumBalance} onChange={(minimumBalance) => setPrefs({ minimumBalance })} />
            </Field>
          </div>
          <div className="mt-3 divide-y divide-line">
            <Toggle checked={prefs.avoidNewDebt} onChange={(avoidNewDebt) => setPrefs({ avoidNewDebt })} label="Avoid new debt" description="Don't suggest plans that rely on loans, EMIs or credit cards." />
            <Toggle checked={prefs.prioritiseEmergencyFund} onChange={(prioritiseEmergencyFund) => setPrefs({ prioritiseEmergencyFund })} label="Emergency fund first" description="Fill the emergency fund before other goals." />
          </div>
          <Field label="Other constraints (one per line)">
            <Textarea rows={3} value={prefs.constraints} onChange={(e) => setPrefs({ constraints: e.target.value })} placeholder="e.g. Send ₹5,000 to parents every month" />
          </Field>
        </Card>
      </div>

      {/* Summary */}
      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="border-accent/20">
          <SectionTitle title="Monthly plan" icon="wallet" />
          <KeyValue
            rows={[
              ['Income', inr(income)],
              ['Planned spending (budgets)', `−${inr(budgetTotal)}`],
              ['…of which fixed', inr(fixed)],
              [<b className="font-medium text-fg">Planned surplus</b>, <b className={cx('font-semibold', surplus >= 0 ? 'text-ok' : 'text-danger')}>{inr(surplus)}</b>],
              ['Planned savings rate', income ? pct((surplus / income) * 100, 1) : '—'],
            ]}
          />
          {income > 0 && surplus / income < prefs.savingsRateTarget / 100 && (
            <p className="mt-3 flex gap-2 text-xs text-warn">
              <Icon name="alert" size={13} className="mt-0.5 shrink-0" /> Your plan saves less than your {prefs.savingsRateTarget}% target.
            </p>
          )}
        </Card>
        <Card>
          <SectionTitle title="Emergency fund" icon="shield" />
          <div className="num text-2xl font-semibold">{ef.monthsCovered.toFixed(1)} months</div>
          <p className="mt-1 text-xs text-muted">
            covered of essential spending ({inr(ef.monthlyEssential)}/mo avg). Target {inr(ef.target)}.
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-accent" style={{ width: `${ef.progress}%` }} />
          </div>
        </Card>
        <Card className="space-y-3">
          <Button variant="primary" icon="save" className="w-full" loading={saving} disabled={!dirty} onClick={save}>
            {dirty ? 'Save profile' : 'Saved'}
          </Button>
          {dirty && (
            <Button variant="ghost" className="w-full" onClick={() => setP(data.profile)}>
              Discard changes
            </Button>
          )}
          <p className="text-center text-[11px] text-faint">
            Stored in this browser · last saved {formatDateLong(data.profile.updatedAt.slice(0, 10))}
          </p>
        </Card>
      </div>
    </div>
  )
}
