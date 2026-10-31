import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { categoryLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/categories'
import type { CategoryId, Transaction } from '../../types/finance'
import { inrPrecise } from '../../utils/currency'
import { formatDateLong } from '../../utils/dates'
import { matchRule, rulePatternFor } from '../../utils/categorize'
import { CategoryIcon, Drawer, KeyValue, SampleBadge } from '../common'
import { Badge, Button, Field, Icon, Input, Select, cx } from '../ui'

const SOURCE_LABEL = { sample: 'Sample data', manual: 'Added manually', csv: 'CSV import', sms: 'SMS import', pdf: 'PDF import' }

/** Transaction detail with category correction + "remember this" learning. */
export function TransactionDrawer({
  transaction,
  all,
  onClose,
  onRecategorize,
  onEdit,
  onDelete,
}: {
  transaction: Transaction | null
  all: Transaction[]
  onClose: () => void
  onRecategorize: (t: Transaction, category: CategoryId, opts: { remember: boolean; applyToSimilar: boolean; pattern: string }) => Promise<number>
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  const [category, setCategory] = useState<CategoryId>('other')
  const [remember, setRemember] = useState(true)
  const [applyToSimilar, setApplyToSimilar] = useState(true)
  const [pattern, setPattern] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ count: number; remembered: boolean } | null>(null)

  useEffect(() => {
    if (!transaction) return
    setCategory(transaction.category)
    setPattern(rulePatternFor(transaction.merchant, transaction.description))
    setRemember(true)
    setApplyToSimilar(true)
    setSaved(null)
    // Reset only when a different transaction is opened (not when this one updates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.id])

  const similar = useMemo(() => {
    if (!transaction || !pattern.trim()) return 0
    const rule = [{ id: 'x', pattern: pattern.trim(), category, createdAt: '', syncStatus: 'local' as const, timesApplied: 0 }]
    return all.filter((x) => x.id !== transaction.id && x.type === transaction.type && x.category !== category && matchRule(`${x.merchant} ${x.description}`, rule)).length
  }, [transaction, all, pattern, category])

  if (!transaction) return null
  const changed = category !== transaction.category
  const categories = transaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function save() {
    if (!transaction) return
    setSaving(true)
    const count = await onRecategorize(transaction, category, { remember, applyToSimilar: remember && applyToSimilar, pattern })
    setSaving(false)
    if (count > 0) setSaved({ count, remembered: remember })
  }

  return (
    <Drawer
      open={!!transaction}
      title="Transaction details"
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" icon="trash" onClick={() => onDelete(transaction)}>
            Delete
          </Button>
          <Button icon="edit" onClick={() => onEdit(transaction)}>
            Edit
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <CategoryIcon category={transaction.category} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{transaction.description}</div>
          <div className="text-xs text-muted">{transaction.merchant}</div>
        </div>
        {transaction.isSample && <SampleBadge label="Sample" />}
      </div>
      <div className={cx('num text-3xl font-semibold tracking-tight', transaction.type === 'income' ? 'text-ok' : 'text-fg')}>
        {transaction.type === 'income' ? '+' : '−'}
        {inrPrecise(transaction.amount)}
      </div>
      <KeyValue
        rows={[
          ['Date', formatDateLong(transaction.date)],
          ['Type', transaction.type === 'income' ? 'Income' : 'Expense'],
          ['Category', categoryLabel(transaction.category)],
          ['Payment method', transaction.paymentMethod],
          ['Source', SOURCE_LABEL[transaction.source]],
          ...(transaction.ruleId ? ([['Categorised by', <Badge tone="violet">Your learned rule</Badge>]] as [string, ReactNode][]) : []),
          ...(transaction.notes ? ([['Notes', transaction.notes]] as [string, ReactNode][]) : []),
        ]}
      />

      <div className="rounded-xl border border-line bg-panel-2 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Icon name="edit" size={14} className="text-accent" /> Correct the category
        </div>
        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as CategoryId)
              setSaved(null)
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        {changed && (
          <div className="fade-in mt-3 space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                Remember this correction for future similar transactions
                <span className="block text-xs text-muted">Finora will categorise matching transactions as {categoryLabel(category)} when they're added or imported.</span>
              </span>
            </label>
            {remember && (
              <>
                <Field label="Match transactions containing" hint="Matched against merchant and description, case-insensitive.">
                  <Input value={pattern} onChange={(e) => setPattern(e.target.value)} />
                </Field>
                {similar > 0 && (
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input type="checkbox" className="size-4" checked={applyToSimilar} onChange={(e) => setApplyToSimilar(e.target.checked)} />
                    Also update {similar} existing similar transaction{similar === 1 ? '' : 's'}
                  </label>
                )}
              </>
            )}
            <Button variant="primary" loading={saving} onClick={save} disabled={remember && !pattern.trim()}>
              Save category
            </Button>
          </div>
        )}

        {saved && (
          <div className="fade-in mt-3 rounded-lg border border-ok/30 bg-ok-soft px-3 py-2.5 text-xs leading-relaxed text-fg/90">
            <div className="flex items-center gap-1.5 font-medium text-ok">
              <Icon name="check" size={13} /> Updated {saved.count} transaction{saved.count === 1 ? '' : 's'}
            </div>
            {saved.remembered && (
              <p className="mt-1">
                Correction rule saved in this browser. It will sync to Finora's learning service when backend integration is available.
              </p>
            )}
          </div>
        )}
      </div>
    </Drawer>
  )
}
