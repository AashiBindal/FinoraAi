import { useEffect, useMemo, useState } from 'react'
import { CategoryBadge, CategoryIcon, SampleBadge, Segmented } from '../components/common'
import { ImportPanel } from '../components/transactions/ImportPanel'
import { TransactionDrawer } from '../components/transactions/TransactionDrawer'
import { TransactionFormModal } from '../components/transactions/TransactionFormModal'
import { Badge, Button, Card, EmptyState, Icon, IconButton, Input, Select, useToast, cx } from '../components/ui'
import { CATEGORIES, categoryLabel } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import { useRouter } from '../lib/router'
import type { CategoryId, Transaction, TransactionType } from '../types/finance'
import { inr, inrPrecise } from '../utils/currency'
import { addMonths, daysInMonth, formatDate, formatDateLong, monthLabel } from '../utils/dates'

type RangeKey = 'month' | '3m' | 'all' | 'custom'
type SortKey = 'date' | 'amount'
const PAGE = 15

export default function Transactions() {
  const { data, month, addTransaction, addTransactions, updateTransaction, deleteTransaction, recategorize, deleteRule } = useFinanceData()
  const { search } = useRouter()
  const toast = useToast()

  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | TransactionType>('all')
  const [category, setCategory] = useState<'all' | CategoryId>('all')
  const [range, setRange] = useState<RangeKey>('month')
  const [from, setFrom] = useState(`${month}-01`)
  const [to, setTo] = useState(`${month}-${daysInMonth(month)}`)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [showImport, setShowImport] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState<{ t: Transaction | null } | null>(null)

  // Read filters from the URL (global search, alert links)
  useEffect(() => {
    const p = new URLSearchParams(search)
    if (p.get('q') !== null) {
      setQ(p.get('q') ?? '')
      setRange('all')
    }
    const c = p.get('category') as CategoryId | null
    if (c && CATEGORIES.some((x) => x.id === c)) setCategory(c)
    if (p.get('month')) setRange('month')
  }, [search])

  useEffect(() => setPage(1), [q, type, category, range, from, to, month])

  const bounds = useMemo((): [string, string] => {
    if (range === 'month') return [`${month}-01`, `${month}-31`]
    if (range === '3m') return [`${addMonths(month, -2)}-01`, `${month}-31`]
    if (range === 'custom') return [from || '0000', to || '9999']
    return ['0000', '9999']
  }, [range, month, from, to])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = data.transactions.filter(
      (t) =>
        t.date >= bounds[0] &&
        t.date <= bounds[1] &&
        (type === 'all' || t.type === type) &&
        (category === 'all' || t.category === category) &&
        (!needle || `${t.description} ${t.merchant} ${t.notes ?? ''} ${categoryLabel(t.category)}`.toLowerCase().includes(needle) || String(t.amount).includes(needle)),
    )
    const dir = sort.dir === 'asc' ? 1 : -1
    return list.sort((a, b) => (sort.key === 'amount' ? (a.amount - b.amount) * dir : a.date.localeCompare(b.date) * dir))
  }, [data.transactions, bounds, type, category, q, sort])

  const totals = useMemo(
    () => filtered.reduce((acc, t) => (t.type === 'income' ? { ...acc, income: acc.income + t.amount } : { ...acc, expense: acc.expense + t.amount }), { income: 0, expense: 0 }),
    [filtered],
  )
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const visible = filtered.slice((page - 1) * PAGE, page * PAGE)
  const filtersActive = q || type !== 'all' || category !== 'all' || range !== 'month'

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  const clearFilters = () => {
    setQ('')
    setType('all')
    setCategory('all')
    setRange('month')
  }

  async function remove(t: Transaction) {
    if (!confirm(`Delete "${t.description}"?`)) return
    await deleteTransaction(t.id)
    setSelected(null)
    toast.success('Transaction deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          <span className="num font-medium text-fg">{filtered.length}</span> transactions ·{' '}
          <span className="num text-ok">+{inr(totals.income)}</span> · <span className="num">−{inr(totals.expense)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="sparkles" variant="ghost" onClick={() => setShowRules((v) => !v)}>
            Learned rules ({data.rules.length})
          </Button>
          <Button icon="upload" onClick={() => setShowImport((v) => !v)}>
            Import
          </Button>
          <Button variant="primary" icon="plus" onClick={() => setEditing({ t: null })}>
            Add transaction
          </Button>
        </div>
      </div>

      {showImport && <ImportPanel existing={data.transactions} rules={data.rules} onConfirm={addTransactions} onClose={() => setShowImport(false)} />}

      {showRules && (
        <Card className="fade-in">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Learned category rules</h2>
              <p className="text-xs text-muted">Created when you correct a category and tick “Remember”. Stored in this browser until backend sync is available.</p>
            </div>
            <IconButton icon="x" label="Close rules" onClick={() => setShowRules(false)} />
          </div>
          {data.rules.length === 0 ? (
            <p className="text-sm text-faint">No rules yet. Open any transaction and change its category to teach Finora.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <code className="rounded bg-panel-2 px-2 py-0.5 font-mono text-xs">“{r.pattern}”</code>
                  <Icon name="arrowRight" size={13} className="text-faint" />
                  <CategoryBadge category={r.category} />
                  <span className="flex-1 text-xs text-faint">applied {r.timesApplied}×</span>
                  <Badge tone={r.syncStatus === 'synced' ? 'ok' : 'neutral'}>{r.syncStatus === 'synced' ? 'Synced' : 'Local only'}</Badge>
                  <IconButton icon="trash" label="Delete rule" onClick={() => deleteRule(r.id)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card padded={false} className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description, merchant, amount…" className="pl-9" aria-label="Search transactions" />
          </div>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
          />
          <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')} className="w-auto min-w-44" aria-label="Category filter">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="w-auto" aria-label="Date range">
            <option value="month">{monthLabel(month)}</option>
            <option value="3m">Last 3 months</option>
            <option value="all">All time</option>
            <option value="custom">Custom range…</option>
          </Select>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="From date" />
              <span className="text-faint">–</span>
              <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label="To date" />
            </div>
          )}
          {filtersActive && (
            <Button size="sm" variant="ghost" icon="x" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="search"
              title={data.transactions.length ? 'No transactions match these filters' : 'No transactions yet'}
              description={data.transactions.length ? 'Try a different search, category or date range.' : 'Add one manually or import a statement.'}
              action={data.transactions.length ? <Button onClick={clearFilters}>Clear filters</Button> : <Button variant="primary" icon="plus" onClick={() => setEditing({ t: null })}>Add transaction</Button>}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-faint">
                    <th className="py-3 pr-2 pl-5 font-medium">
                      <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => toggleSort('date')}>
                        Date {sort.key === 'date' && <Icon name={sort.dir === 'desc' ? 'chevronDown' : 'chevronUp'} size={12} />}
                      </button>
                    </th>
                    <th className="px-2 py-3 font-medium">Description</th>
                    <th className="hidden px-2 py-3 font-medium md:table-cell">Category</th>
                    <th className="hidden px-2 py-3 font-medium lg:table-cell">Method</th>
                    <th className="py-3 pr-5 pl-2 text-right font-medium">
                      <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => toggleSort('amount')}>
                        Amount {sort.key === 'amount' && <Icon name={sort.dir === 'desc' ? 'chevronDown' : 'chevronUp'} size={12} />}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((t) => (
                    <tr key={t.id} onClick={() => setSelected(t)} className="cursor-pointer transition-colors hover:bg-panel-2" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(t)}>
                      <td className="py-3 pr-2 pl-5 whitespace-nowrap text-muted" title={formatDateLong(t.date)}>
                        {formatDate(t.date)}
                      </td>
                      <td className="max-w-[18rem] px-2 py-3">
                        <div className="flex items-center gap-3">
                          <span className="md:hidden">
                            <CategoryIcon category={t.category} size="sm" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{t.description}</span>
                              {t.ruleId && <Icon name="sparkles" size={12} className="shrink-0 text-violet" aria-label="Categorised by your rule" />}
                            </div>
                            <div className="truncate text-xs text-faint">
                              {t.merchant}
                              {t.isSample && ' · sample'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 md:table-cell">
                        <CategoryBadge category={t.category} />
                      </td>
                      <td className="hidden px-2 py-3 text-muted lg:table-cell">{t.paymentMethod}</td>
                      <td className={cx('num py-3 pr-5 pl-2 text-right font-medium whitespace-nowrap', t.type === 'income' ? 'text-ok' : 'text-fg')}>
                        {t.type === 'income' ? '+' : '−'}
                        {inrPrecise(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-muted">
              <span className="flex items-center gap-2">
                Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} of {filtered.length}
                {data.transactions.some((t) => t.isSample) && <SampleBadge />}
              </span>
              <div className="flex items-center gap-1">
                <IconButton icon="chevronLeft" label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-30" />
                <span className="num px-2">
                  {page} / {pages}
                </span>
                <IconButton icon="chevronRight" label="Next page" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="disabled:opacity-30" />
              </div>
            </div>
          </>
        )}
      </Card>

      <TransactionDrawer
        transaction={selected ? (data.transactions.find((t) => t.id === selected.id) ?? null) : null}
        all={data.transactions}
        onClose={() => setSelected(null)}
        onRecategorize={recategorize}
        onEdit={(t) => {
          setSelected(null)
          setEditing({ t })
        }}
        onDelete={remove}
      />

      <TransactionFormModal
        open={!!editing}
        transaction={editing?.t ?? null}
        rules={data.rules}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (editing?.t) {
            const ok = await updateTransaction(editing.t.id, input)
            if (ok) toast.success('Transaction updated')
            return ok
          }
          const t = await addTransaction(input)
          if (t) toast.success(`Added ${inr(t.amount)} · ${categoryLabel(t.category)}`)
          return !!t
        }}
      />
    </div>
  )
}
