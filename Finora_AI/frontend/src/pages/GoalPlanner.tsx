import { useEffect, useState } from 'react'
import { FieldError, KpiCard, SampleBadge } from '../components/common'
import { WhatIfSimulator } from '../components/goals/WhatIfSimulator'
import { Badge, Button, Card, EmptyState, Field, Icon, IconButton, Input, Modal, ProgressBar, Select, useToast, type IconName } from '../components/ui'
import { useFinanceData } from '../hooks/useFinance'
import type { Goal, GoalInput, GoalKind } from '../types/finance'
import { inr, inrCompact, pct } from '../utils/currency'
import { addMonths, formatDate, monthKey, today, todayISO } from '../utils/dates'
import { goalProgress, summarizeMonth } from '../utils/finance'

const KIND: Record<GoalKind, { label: string; icon: IconName }> = {
  emergency: { label: 'Emergency fund', icon: 'shield' },
  purchase: { label: 'Purchase', icon: 'bag' },
  education: { label: 'Education', icon: 'book' },
  travel: { label: 'Travel', icon: 'calendar' },
  home: { label: 'Home', icon: 'home' },
  other: { label: 'Other', icon: 'target' },
}

const TEMPLATES: { name: string; kind: GoalKind; target: number; months: number }[] = [
  { name: 'Emergency fund', kind: 'emergency', target: 100000, months: 12 },
  { name: 'New laptop', kind: 'purchase', target: 50000, months: 6 },
  { name: 'Education fund', kind: 'education', target: 200000, months: 24 },
  { name: 'Vacation', kind: 'travel', target: 60000, months: 9 },
]

function GoalCard({ goal, onEdit, onDelete, onContribute }: { goal: Goal; onEdit: () => void; onDelete: () => void; onContribute: () => void }) {
  const p = goalProgress(goal)
  const done = p.remaining === 0
  return (
    <Card className="flex flex-col gap-4 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon name={KIND[goal.kind].icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{goal.name}</div>
          <div className="text-xs text-faint">
            {KIND[goal.kind].label} · by {formatDate(goal.targetDate, { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <Badge tone={done ? 'ok' : p.onTrack ? 'accent' : 'warn'} dot>
          {done ? 'Reached' : p.onTrack ? 'On track' : 'Behind'}
        </Badge>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="num text-xl font-semibold">{inr(goal.savedAmount)}</span>
          <span className="num text-xs text-faint">of {inr(goal.targetAmount)}</span>
        </div>
        <ProgressBar value={p.progress} tone={done ? 'ok' : p.onTrack ? 'accent' : 'warn'} className="h-2" />
        <div className="num mt-1 text-right text-[11px] text-faint">{pct(p.progress)}</div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-faint">Monthly contribution</dt>
          <dd className="num font-medium text-fg">{inr(goal.monthlyContribution)}</dd>
        </div>
        <div>
          <dt className="text-faint">Needed to hit date</dt>
          <dd className={`num font-medium ${p.onTrack ? 'text-fg' : 'text-warn'}`}>{done ? '—' : `${inr(p.requiredMonthly)}/mo`}</dd>
        </div>
        <div>
          <dt className="text-faint">Remaining</dt>
          <dd className="num font-medium text-fg">{inr(p.remaining)}</dd>
        </div>
        <div>
          <dt className="text-faint">Estimated completion</dt>
          <dd className="num font-medium text-fg">{done ? 'Done' : p.projectedDate ? formatDate(p.projectedDate, { month: 'short', year: 'numeric' }) : 'Add a contribution'}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
        <Button size="sm" icon="plus" onClick={onContribute}>
          Add money
        </Button>
        <span className="flex-1" />
        {goal.isSample && <SampleBadge label="Sample" />}
        <IconButton icon="edit" label="Edit goal" onClick={onEdit} />
        <IconButton icon="trash" label="Delete goal" onClick={onDelete} />
      </div>
    </Card>
  )
}

export default function GoalPlanner() {
  const { data, month, saveGoal, deleteGoal, contributeToGoal } = useFinanceData()
  const toast = useToast()
  const [form, setForm] = useState<{ goal: Goal | null; template?: (typeof TEMPLATES)[number] } | null>(null)
  const [contrib, setContrib] = useState<Goal | null>(null)

  const totals = data.goals.reduce((a, g) => ({ target: a.target + g.targetAmount, saved: a.saved + g.savedAmount, monthly: a.monthly + g.monthlyContribution }), { target: 0, saved: 0, monthly: 0 })
  const surplus = summarizeMonth(data.transactions, month).savings
  const onTrack = data.goals.filter((g) => goalProgress(g).onTrack).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard accent label="Saved towards goals" icon="piggyBank" value={inr(totals.saved)} hint={`of ${inr(totals.target)}`}>
          <ProgressBar value={totals.target ? (totals.saved / totals.target) * 100 : 0} />
        </KpiCard>
        <KpiCard label="Monthly contributions" icon="repeat" value={inr(totals.monthly)} hint={`${surplus > 0 ? pct((totals.monthly / surplus) * 100) : '—'} of this month's surplus`} />
        <KpiCard label="Unallocated surplus" icon="wallet" value={inr(Math.max(0, surplus - totals.monthly))} hint={surplus - totals.monthly < 0 ? `Over-committed by ${inr(totals.monthly - surplus)}` : 'Available for new goals'} />
        <KpiCard label="Goals on track" icon="target" value={`${onTrack}/${data.goals.length}`} hint="At current contributions" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Your goals</h2>
        <Button variant="primary" icon="plus" onClick={() => setForm({ goal: null })}>
          New goal
        </Button>
      </div>

      {data.goals.length === 0 ? (
        <EmptyState
          icon="target"
          title="No goals yet"
          description="Pick a template or create your own goal."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {TEMPLATES.map((t) => (
                <Button key={t.name} size="sm" onClick={() => setForm({ goal: null, template: t })}>
                  {t.name}
                </Button>
              ))}
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => setForm({ goal: g })}
              onContribute={() => setContrib(g)}
              onDelete={async () => {
                if (confirm(`Delete "${g.name}"?`)) {
                  await deleteGoal(g.id)
                  toast.success('Goal deleted')
                }
              }}
            />
          ))}
          <button onClick={() => setForm({ goal: null })} className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm text-muted transition-colors hover:border-accent/50 hover:text-fg">
            <Icon name="plus" size={18} />
            Add a goal
            <span className="text-xs text-faint">Laptop, education, travel, home…</span>
          </button>
        </div>
      )}

      <WhatIfSimulator data={data} month={month} />

      <GoalFormModal
        state={form}
        onClose={() => setForm(null)}
        onSave={async (input) => {
          const ok = await saveGoal(input, form?.goal?.id)
          if (ok) toast.success(form?.goal ? 'Goal updated' : 'Goal created')
          return ok
        }}
      />
      <ContributeModal
        goal={contrib}
        onClose={() => setContrib(null)}
        onSave={async (amount) => {
          if (!contrib) return
          await contributeToGoal(contrib, amount)
          toast.success(`${amount >= 0 ? 'Added' : 'Withdrew'} ${inr(Math.abs(amount))} ${amount >= 0 ? 'to' : 'from'} ${contrib.name}`)
          setContrib(null)
        }}
      />
    </div>
  )
}

function GoalFormModal({ state, onClose, onSave }: { state: { goal: Goal | null; template?: (typeof TEMPLATES)[number] } | null; onClose: () => void; onSave: (g: GoalInput) => Promise<boolean> }) {
  const [f, setF] = useState({ name: '', kind: 'other' as GoalKind, target: '', saved: '', date: '', monthly: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state) return
    const g = state.goal
    const t = state.template
    setErrors({})
    setF(
      g
        ? { name: g.name, kind: g.kind, target: String(g.targetAmount), saved: String(g.savedAmount), date: g.targetDate, monthly: String(g.monthlyContribution) }
        : { name: t?.name ?? '', kind: t?.kind ?? 'other', target: t ? String(t.target) : '', saved: '0', date: `${addMonths(monthKey(today()), t?.months ?? 12)}-28`, monthly: '' },
    )
  }, [state])

  const target = Number(f.target)
  const saved = Number(f.saved || 0)
  const months = f.date ? Math.max(1, (new Date(`${f.date}T00:00:00`).getFullYear() - today().getFullYear()) * 12 + new Date(`${f.date}T00:00:00`).getMonth() - today().getMonth()) : 0
  const suggested = target > saved && months ? Math.ceil((target - saved) / months / 100) * 100 : 0

  async function submit() {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Give your goal a name.'
    if (!(target > 0)) e.target = 'Target must be greater than ₹0.'
    if (saved < 0 || Number.isNaN(saved)) e.saved = 'Saved amount can’t be negative.'
    else if (saved > target && target > 0) e.saved = 'Saved amount is more than the target.'
    if (!f.date) e.date = 'Pick a target date.'
    else if (f.date <= todayISO()) e.date = 'Target date must be in the future.'
    const monthly = Number(f.monthly || 0)
    if (monthly < 0 || Number.isNaN(monthly)) e.monthly = 'Contribution can’t be negative.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const ok = await onSave({ name: f.name.trim(), kind: f.kind, targetAmount: target, savedAmount: saved, targetDate: f.date, monthlyContribution: monthly })
    setSaving(false)
    if (ok) onClose()
  }

  const numeric = (k: 'target' | 'saved' | 'monthly') => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value.replace(/[^\d]/g, '') })

  return (
    <Modal
      open={!!state}
      title={state?.goal ? 'Edit goal' : 'New goal'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            {state?.goal ? 'Save goal' : 'Create goal'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3">
        <Field label="Goal name">
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Save for a laptop" className={errors.name ? 'field-error' : ''} />
          <FieldError message={errors.name} />
        </Field>
        <Field label="Type">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as GoalKind })}>
            {Object.entries(KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target amount (₹)">
          <Input inputMode="numeric" value={f.target} onChange={numeric('target')} className={errors.target ? 'field-error' : ''} />
          <FieldError message={errors.target} />
        </Field>
        <Field label="Already saved (₹)">
          <Input inputMode="numeric" value={f.saved} onChange={numeric('saved')} className={errors.saved ? 'field-error' : ''} />
          <FieldError message={errors.saved} />
        </Field>
        <Field label="Target date">
          <Input type="date" value={f.date} min={todayISO()} onChange={(e) => setF({ ...f, date: e.target.value })} className={errors.date ? 'field-error' : ''} />
          <FieldError message={errors.date} />
        </Field>
        <Field label="Monthly contribution (₹)">
          <Input inputMode="numeric" value={f.monthly} onChange={numeric('monthly')} className={errors.monthly ? 'field-error' : ''} />
          <FieldError message={errors.monthly} />
        </Field>
      </div>
      {suggested > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-panel-2 px-3 py-2.5 text-xs text-muted">
          <span>
            To reach {inrCompact(target)} in {months} month{months === 1 ? '' : 's'}, save about <b className="num text-fg">{inr(suggested)}</b>/month.
          </span>
          <button className="shrink-0 font-medium text-accent hover:underline" onClick={() => setF({ ...f, monthly: String(suggested) })}>
            Use this
          </button>
        </div>
      )}
    </Modal>
  )
}

function ContributeModal({ goal, onClose, onSave }: { goal: Goal | null; onClose: () => void; onSave: (amount: number) => Promise<void> }) {
  const [amount, setAmount] = useState('')
  const [withdraw, setWithdraw] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (goal) {
      setAmount(String(goal.monthlyContribution || ''))
      setWithdraw(false)
      setError('')
    }
  }, [goal])
  const submit = async () => {
    const n = Number(amount)
    if (!(n > 0)) return setError('Enter an amount greater than ₹0.')
    if (withdraw && goal && n > goal.savedAmount) return setError(`You can withdraw at most ${inr(goal.savedAmount)}.`)
    await onSave(withdraw ? -n : n)
  }
  return (
    <Modal
      open={!!goal}
      title={goal ? `Update ${goal.name}` : ''}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {withdraw ? 'Withdraw' : 'Add money'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">Record money you moved into (or out of) this goal. Finora doesn't move money itself.</p>
      <Field label="Amount (₹)">
        <Input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} className={error ? 'field-error' : ''} />
        <FieldError message={error} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} />
        This is a withdrawal
      </label>
    </Modal>
  )
}
