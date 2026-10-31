import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/categories'
import type { CategoryId, CategoryRule, PaymentMethod, Transaction, TransactionInput, TransactionType } from '../../types/finance'
import { suggestCategory } from '../../utils/categorize'
import { addDays, toISODate, today, todayISO } from '../../utils/dates'
import { merchantFrom } from '../../utils/importParsers'
import { FieldError, Segmented } from '../common'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'

export const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Net Banking', 'Auto-debit', 'Cash', 'Other']

interface Form {
  type: TransactionType
  date: string
  description: string
  amount: string
  category: CategoryId
  paymentMethod: PaymentMethod
  notes: string
}
type Errors = Partial<Record<keyof Form, string>>

export function validateTransaction(f: Form): Errors {
  const e: Errors = {}
  if (!f.description.trim()) e.description = 'Add a short description.'
  else if (f.description.length > 120) e.description = 'Keep it under 120 characters.'
  const amount = Number(f.amount)
  if (!f.amount.trim()) e.amount = 'Enter an amount.'
  else if (!Number.isFinite(amount) || amount <= 0) e.amount = 'Amount must be greater than ₹0.'
  else if (amount > 1e8) e.amount = 'That amount looks too large.'
  else if (!/^\d+(\.\d{1,2})?$/.test(f.amount.trim())) e.amount = 'Use up to 2 decimal places.'
  if (!f.date) e.date = 'Pick a date.'
  else if (f.date > toISODate(addDays(today(), 31))) e.date = 'Date is too far in the future.'
  else if (f.date < '2000-01-01') e.date = 'Date is too far in the past.'
  return e
}

export function TransactionFormModal({
  open,
  transaction,
  rules,
  onClose,
  onSave,
}: {
  open: boolean
  transaction: Transaction | null
  rules: CategoryRule[]
  onClose: () => void
  onSave: (input: TransactionInput) => Promise<boolean>
}) {
  const [form, setForm] = useState<Form>(blank())
  const [errors, setErrors] = useState<Errors>({})
  const [touchedCategory, setTouchedCategory] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setTouchedCategory(!!transaction)
    setForm(
      transaction
        ? {
            type: transaction.type,
            date: transaction.date,
            description: transaction.description,
            amount: String(transaction.amount),
            category: transaction.category,
            paymentMethod: transaction.paymentMethod,
            notes: transaction.notes ?? '',
          }
        : blank(),
    )
  }, [open, transaction])

  // Auto-suggest a category while typing (until the user picks one)
  const setDescription = (description: string) => {
    setForm((f) => ({ ...f, description, category: touchedCategory ? f.category : suggestCategory(description, f.type, rules).category }))
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function submit() {
    const e = validateTransaction(form)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const ok = await onSave({
      type: form.type,
      date: form.date,
      description: form.description.trim(),
      merchant: transaction?.merchant ?? merchantFrom(form.description.trim()),
      amount: Math.round(Number(form.amount) * 100) / 100,
      category: form.category,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim() || undefined,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      title={transaction ? 'Edit transaction' : 'Add transaction'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <Segmented
        size="md"
        value={form.type}
        onChange={(type) => setForm((f) => ({ ...f, type, category: type === 'income' ? 'salary' : f.category === 'salary' ? 'other' : f.category }))}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />
      <Field label="Description">
        <Input autoFocus value={form.description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Swiggy dinner order" className={errors.description ? 'field-error' : ''} />
        <FieldError message={errors.description} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" className={errors.amount ? 'field-error' : ''} />
          <FieldError message={errors.amount} />
        </Field>
        <Field label="Date">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={errors.date ? 'field-error' : ''} />
          <FieldError message={errors.date} />
        </Field>
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(e) => {
              setTouchedCategory(true)
              setForm({ ...form, category: e.target.value as CategoryId })
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment method">
          <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-16" />
      </Field>
    </Modal>
  )
}

function blank(): Form {
  return { type: 'expense', date: todayISO(), description: '', amount: '', category: 'other', paymentMethod: 'UPI', notes: '' }
}
