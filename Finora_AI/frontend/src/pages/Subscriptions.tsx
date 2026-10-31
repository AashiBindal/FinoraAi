import { useEffect, useMemo, useState } from 'react'
import { CategoryIcon, DemoNotice, Drawer, FieldError, KeyValue, KpiCard, SampleBadge, SectionTitle } from '../components/common'
import { PAYMENT_METHODS } from '../components/transactions/TransactionFormModal'
import { Badge, Button, Card, EmptyState, Field, Icon, Input, Modal, Select, Textarea, useToast, cx } from '../components/ui'
import { categoryLabel, EXPENSE_CATEGORIES } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import type { BillingFrequency, CategoryId, PaymentMethod, Subscription, SubscriptionInput, SubscriptionStatus, UsageLevel } from '../types/finance'
import { inr } from '../utils/currency'
import { daysUntil, formatDate, formatDateLong, todayISO } from '../utils/dates'
import { lastPayment, monthlyEquivalent, nextPayment, pctChange, recurringTotals } from '../utils/finance'

const FREQ: Record<BillingFrequency, string> = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const STATUS: Record<SubscriptionStatus, { label: string; tone: 'ok' | 'warn' | 'neutral' }> = {
  active: { label: 'Active', tone: 'ok' },
  paused: { label: 'Paused', tone: 'warn' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}
const USAGE: Record<UsageLevel, string> = { often: 'Use it often', sometimes: 'Use it sometimes', rarely: 'Rarely use it', unknown: 'Not sure' }

export default function Subscriptions() {
  const { data, saveSubscription, deleteSubscription } = useFinanceData()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<{ sub: Subscription | null } | null>(null)

  const subs = data.subscriptions
  const totals = recurringTotals(subs)
  const rows = useMemo(
    () =>
      subs
        .map((s) => ({ s, next: nextPayment(s), last: lastPayment(s) }))
        .sort((a, b) => (a.next ?? '9999').localeCompare(b.next ?? '9999')),
    [subs],
  )
  const nextUp = rows.find((r) => r.next)
  const priceUps = subs.filter((s) => s.status === 'active' && s.previousAmount && s.amount > s.previousAmount)
  const rarely = subs.filter((s) => s.status === 'active' && s.usage === 'rarely')
  const upcoming30 = rows.filter((r) => r.next && daysUntil(r.next) <= 30)
  const selected = subs.find((s) => s.id === selectedId) ?? null

  async function setStatus(s: Subscription, status: SubscriptionStatus) {
    if (await saveSubscription({ ...strip(s), status }, s.id)) toast.success(`${s.name} ${status === 'active' ? 'resumed' : status}`)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard accent label="Monthly recurring" icon="repeat" value={inr(totals.monthly)} hint="Yearly plans spread per month" />
        <KpiCard label="Yearly estimate" icon="calendar" value={inr(totals.yearly)} hint="If nothing changes" />
        <KpiCard label="Active subscriptions" icon="checkSquare" value={totals.activeCount} hint={`${subs.length - totals.activeCount} paused or cancelled`} />
        <KpiCard label="Next payment" icon="clock" value={nextUp ? inr(nextUp.s.amount) : '—'} hint={nextUp?.next ? `${nextUp.s.name} · ${formatDate(nextUp.next)}` : 'Nothing scheduled'} />
      </div>

      {(priceUps.length > 0 || rarely.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {priceUps.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border border-warn/25 bg-warn-soft/50 p-4">
              <Icon name="trendingUp" size={16} className="mt-0.5 text-warn" />
              <div className="text-sm">
                <div className="font-medium">
                  {s.name} price increased {pctChange(s.amount, s.previousAmount!).toFixed(0)}%
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {inr(s.previousAmount!)} → {inr(s.amount)} · about {inr((s.amount - s.previousAmount!) * (s.frequency === 'yearly' ? 1 : 12))} more a year
                </div>
              </div>
            </div>
          ))}
          {rarely.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border border-line bg-panel-2 p-4">
              <Icon name="info" size={16} className="mt-0.5 text-info" />
              <div className="text-sm">
                <div className="font-medium">{s.name} may be unused</div>
                <div className="mt-0.5 text-xs text-muted">
                  You marked it as rarely used - it costs {inr(monthlyEquivalent(s) * 12)} a year. Finora doesn't track actual usage.
                </div>
                <button className="mt-2 text-xs font-medium text-accent hover:underline" onClick={() => setStatus(s, 'paused')}>
                  Mark as paused
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <SectionTitle title="All recurring payments" subtitle="Click a row for details" />
            <Button variant="primary" icon="plus" size="sm" onClick={() => setForm({ sub: null })}>
              Add
            </Button>
          </div>
          {subs.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState icon="repeat" title="No subscriptions yet" description="Track Netflix, internet, gym and other recurring payments here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-line text-left text-xs text-faint">
                  <tr>
                    <th className="py-2.5 pr-2 pl-5 font-medium">Subscription</th>
                    <th className="px-2 py-2.5 text-right font-medium">Amount</th>
                    <th className="hidden px-2 py-2.5 font-medium sm:table-cell">Frequency</th>
                    <th className="px-2 py-2.5 font-medium">Next payment</th>
                    <th className="hidden px-2 py-2.5 font-medium lg:table-cell">Last payment</th>
                    <th className="py-2.5 pr-5 pl-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(({ s, next, last }) => {
                    const days = next ? daysUntil(next) : null
                    return (
                      <tr key={s.id} onClick={() => setSelectedId(s.id)} className={cx('cursor-pointer transition-colors hover:bg-panel-2', s.status !== 'active' && 'opacity-60')}>
                        <td className="py-3 pr-2 pl-5">
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={s.category} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                {s.name}
                                {s.previousAmount && s.amount > s.previousAmount && <Icon name="trendingUp" size={12} className="text-warn" aria-label="Price increased" />}
                              </div>
                              <div className="text-xs text-faint">{categoryLabel(s.category)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="num px-2 py-3 text-right font-medium">{inr(s.amount)}</td>
                        <td className="hidden px-2 py-3 text-muted sm:table-cell">{FREQ[s.frequency]}</td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          {next ? (
                            <>
                              <div>{formatDate(next)}</div>
                              <div className={cx('text-xs', days !== null && days <= 3 ? 'text-warn' : 'text-faint')}>{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`}</div>
                            </>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="hidden px-2 py-3 text-muted lg:table-cell">{last ? formatDate(last) : '—'}</td>
                        <td className="py-3 pr-5 pl-2">
                          <Badge tone={STATUS[s.status].tone} dot>
                            {STATUS[s.status].label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {subs.some((s) => s.isSample) && (
            <div className="border-t border-line px-5 py-3">
              <SampleBadge />
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title="Next 30 days" icon="calendar" subtitle={`${inr(upcoming30.reduce((t, r) => t + r.s.amount, 0))} due`} />
          {upcoming30.length === 0 ? (
            <p className="text-sm text-muted">Nothing due in the next 30 days.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {upcoming30.map(({ s, next }) => (
                <li key={s.id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-panel bg-accent" />
                  <div className="text-xs text-faint">{formatDateLong(next!)}</div>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="num font-medium">{inr(s.amount)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Drawer
        open={!!selected}
        title={selected?.name ?? ''}
        onClose={() => setSelectedId(null)}
        footer={
          selected && (
            <>
              <Button
                variant="danger"
                icon="trash"
                onClick={async () => {
                  if (confirm(`Delete ${selected.name}?`)) {
                    await deleteSubscription(selected.id)
                    setSelectedId(null)
                  }
                }}
              >
                Delete
              </Button>
              <Button icon="edit" onClick={() => setForm({ sub: selected })}>
                Edit
              </Button>
            </>
          )
        }
      >
        {selected && (
          <>
            <div className="flex items-center gap-3">
              <CategoryIcon category={selected.category} />
              <div>
                <div className="num text-2xl font-semibold">{inr(selected.amount)}</div>
                <div className="text-xs text-muted">{FREQ[selected.frequency]}</div>
              </div>
              <span className="ml-auto">
                <Badge tone={STATUS[selected.status].tone} dot>
                  {STATUS[selected.status].label}
                </Badge>
              </span>
            </div>
            <KeyValue
              rows={[
                ['Next payment', nextPayment(selected) ? formatDateLong(nextPayment(selected)!) : 'Not scheduled'],
                ['Last payment', lastPayment(selected) ? formatDateLong(lastPayment(selected)!) : '—'],
                ['Monthly equivalent', inr(monthlyEquivalent(selected))],
                ['Yearly cost', inr(monthlyEquivalent(selected) * 12)],
                ['Category', categoryLabel(selected.category)],
                ['Payment method', selected.paymentMethod],
                ['Your usage (self-reported)', USAGE[selected.usage]],
                ...(selected.previousAmount ? ([['Previous price', inr(selected.previousAmount)]] as [string, string][]) : []),
              ]}
            />
            {selected.notes && <p className="text-sm text-muted">{selected.notes}</p>}
            <div className="flex flex-wrap gap-2">
              {selected.status !== 'active' && (
                <Button size="sm" icon="refresh" onClick={() => setStatus(selected, 'active')}>
                  Resume
                </Button>
              )}
              {selected.status === 'active' && (
                <Button size="sm" onClick={() => setStatus(selected, 'paused')}>
                  Pause
                </Button>
              )}
              {selected.status !== 'cancelled' && (
                <Button size="sm" variant="ghost" onClick={() => setStatus(selected, 'cancelled')}>
                  Mark cancelled
                </Button>
              )}
            </div>
            <DemoNotice>Status changes are tracked in Finora only - cancel the service with the provider too. Finora never moves money or cancels on your behalf.</DemoNotice>
          </>
        )}
      </Drawer>

      <SubscriptionForm
        open={!!form}
        sub={form?.sub ?? null}
        onClose={() => setForm(null)}
        onSave={async (input) => {
          const ok = await saveSubscription(input, form?.sub?.id)
          if (ok) toast.success(form?.sub ? 'Subscription updated' : 'Subscription added')
          return ok
        }}
      />
    </div>
  )
}

const strip = (s: Subscription): SubscriptionInput => {
  const { id: _id, isSample: _sample, ...rest } = s
  void _id
  void _sample
  return rest
}

function SubscriptionForm({ open, sub, onClose, onSave }: { open: boolean; sub: Subscription | null; onClose: () => void; onSave: (input: SubscriptionInput) => Promise<boolean> }) {
  const empty: SubscriptionInput = { name: '', category: 'entertainment', amount: 0, frequency: 'monthly', billingStartDate: todayISO(), status: 'active', usage: 'unknown', paymentMethod: 'Card', notes: '' }
  const [f, setF] = useState<SubscriptionInput>(empty)
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const base = sub ? strip(sub) : empty
    setF(base)
    setAmount(sub ? String(sub.amount) : '')
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sub])

  async function submit() {
    const e: Record<string, string> = {}
    const n = Number(amount)
    if (!f.name.trim()) e.name = 'Name is required.'
    if (!amount || !Number.isFinite(n) || n <= 0) e.amount = 'Enter an amount greater than ₹0.'
    if (!f.billingStartDate) e.date = 'Pick the billing date.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    // Keep the old price when the amount changes, so price-increase alerts work
    const previousAmount = sub && n !== sub.amount ? sub.amount : f.previousAmount
    const ok = await onSave({ ...f, name: f.name.trim(), amount: n, previousAmount, notes: f.notes?.trim() || undefined })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      title={sub ? `Edit ${sub.name}` : 'Add subscription'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Netflix Premium" className={errors.name ? 'field-error' : ''} />
        <FieldError message={errors.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className={errors.amount ? 'field-error' : ''} />
          <FieldError message={errors.amount} />
        </Field>
        <Field label="Billing frequency">
          <Select value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as BillingFrequency })}>
            {Object.entries(FREQ).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="First / a past billing date" hint="Future dates are calculated from this.">
          <Input type="date" value={f.billingStartDate} onChange={(e) => setF({ ...f, billingStartDate: e.target.value })} className={errors.date ? 'field-error' : ''} />
          <FieldError message={errors.date} />
        </Field>
        <Field label="Category">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as CategoryId })}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment method">
          <Select value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="How often do you use it?">
          <Select value={f.usage} onChange={(e) => setF({ ...f, usage: e.target.value as UsageLevel })}>
            {Object.entries(USAGE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} className="min-h-16" value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </Field>
    </Modal>
  )
}
