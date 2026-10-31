// Upload workflow: Upload → Processing → Extracted → Review → Confirm.
// CSV and SMS are parsed for real in the browser. PDF needs the backend
// parser, which isn't connected - the UI says so and offers a clearly
// labelled sample extraction instead.

import { useRef, useState, type DragEvent } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/categories'
import { sampleStatementRows } from '../../data/sampleData'
import type { CategoryId, CategoryRule, Transaction, TransactionInput, TransactionSource } from '../../types/finance'
import { suggestCategory } from '../../utils/categorize'
import { inrPrecise } from '../../utils/currency'
import { formatDate } from '../../utils/dates'
import { detectUploadKind, MAX_UPLOAD_BYTES, parseCsv, parseSms, SAMPLE_CSV, SAMPLE_SMS, type ParsedRow } from '../../utils/importParsers'
import { DemoNotice, Segmented } from '../common'
import { Badge, Button, Card, Icon, Spinner, Textarea, cx } from '../ui'

type Step = 'upload' | 'processing' | 'review' | 'done'
const STEPS = ['Upload', 'Processing', 'Extracted', 'Review', 'Confirm']
const STEP_INDEX: Record<Step, number> = { upload: 0, processing: 1, review: 3, done: 4 }

interface ReviewRow extends ParsedRow {
  key: string
  include: boolean
  category: CategoryId
  ruleId?: string
  duplicate: boolean
  sample?: boolean
}

function Stepper({ step }: { step: Step }) {
  const current = STEP_INDEX[step]
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
      {STEPS.map((label, i) => {
        const done = i < current || step === 'done'
        const active = i === current && step !== 'done'
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cx(
                'grid size-5 place-items-center rounded-full border text-[10px] font-semibold',
                done ? 'border-accent bg-accent text-on-accent' : active ? 'border-accent text-accent' : 'border-line-strong text-faint',
              )}
            >
              {done ? <Icon name="check" size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className={active ? 'font-medium text-fg' : done ? 'text-muted' : 'text-faint'}>{label}</span>
            {i < STEPS.length - 1 && <span className={cx('h-px w-5 sm:w-8', done ? 'bg-accent/60' : 'bg-line-strong')} />}
          </li>
        )
      })}
    </ol>
  )
}

export function ImportPanel({
  existing,
  rules,
  onConfirm,
  onClose,
}: {
  existing: Transaction[]
  rules: CategoryRule[]
  onConfirm: (inputs: TransactionInput[]) => Promise<number>
  onClose: () => void
}) {
  const [mode, setMode] = useState<'file' | 'sms'>('file')
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [pdfBlocked, setPdfBlocked] = useState<string | null>(null)
  const [sms, setSms] = useState('')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [source, setSource] = useState<TransactionSource>('csv')
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('upload')
    setError(null)
    setPdfBlocked(null)
    setRows([])
    setWarnings([])
  }

  const toReview = (parsed: ParsedRow[], src: TransactionSource, sample = false): ReviewRow[] =>
    parsed.map((r, i) => {
      const s = suggestCategory(`${r.merchant} ${r.description}`, r.type, rules)
      const duplicate = existing.some((e) => e.date === r.date && Math.abs(e.amount - r.amount) < 0.01 && e.type === r.type)
      return { ...r, key: `${src}-${i}`, include: !duplicate, category: s.category, ruleId: s.ruleId, duplicate, sample }
    })

  async function process(run: () => { rows: ParsedRow[]; warnings: string[] }, src: TransactionSource) {
    setError(null)
    setStep('processing')
    setSource(src)
    await new Promise((r) => setTimeout(r, 700)) // let the processing state register
    try {
      const result = run()
      if (result.rows.length === 0) {
        setError(result.warnings[0] ?? 'No transactions found.')
        setStep('upload')
        return
      }
      setWarnings(result.warnings)
      setRows(toReview(result.rows, src))
      setStep('review')
    } catch {
      setError('Something went wrong while reading the data.')
      setStep('upload')
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setPdfBlocked(null)
    const kind = detectUploadKind(file)
    if (!kind) return setError(`"${file.name}" isn't supported. Upload a .csv or .pdf bank statement.`)
    if (file.size > MAX_UPLOAD_BYTES) return setError('File is larger than 10 MB.')
    if (file.size === 0) return setError('That file is empty.')
    setFileName(file.name)
    if (kind === 'pdf') {
      setStep('processing')
      await new Promise((r) => setTimeout(r, 900))
      setStep('upload')
      setPdfBlocked(file.name)
      return
    }
    const text = await file.text()
    await process(() => parseCsv(text), 'csv')
  }

  function loadSamplePdf() {
    const parsed = sampleStatementRows().map(({ date, description, merchant, amount, type, paymentMethod }) => ({ date, description, merchant, amount, type, paymentMethod }))
    setPdfBlocked(null)
    setSource('pdf')
    setWarnings(['These rows are a sample extraction for demonstration - they were not read from your PDF.'])
    setRows(toReview(parsed, 'pdf', true))
    setStep('review')
  }

  async function confirm() {
    const chosen = rows.filter((r) => r.include)
    if (!chosen.length) return
    setSaving(true)
    const n = await onConfirm(
      chosen.map((r) => ({
        date: r.date,
        description: r.description,
        merchant: r.merchant,
        amount: r.amount,
        type: r.type,
        category: r.category,
        paymentMethod: r.paymentMethod,
        source,
        ruleId: r.ruleId,
        notes: r.sample ? 'Sample extraction (demo) - not from a real statement' : undefined,
      })),
    )
    setSaving(false)
    if (n > 0) {
      setImportedCount(n)
      setStep('done')
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    void handleFile(e.dataTransfer.files[0])
  }

  const included = rows.filter((r) => r.include)

  return (
    <Card className="border-accent/20">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="upload" size={16} className="text-accent" /> Import transactions
          </h2>
          <p className="mt-0.5 text-xs text-muted">Bank statement (CSV or PDF) or transaction SMS. You review everything before it's saved.</p>
        </div>
        <Button size="sm" variant="ghost" icon="x" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="mb-5">
        <Stepper step={step} />
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m)
              setError(null)
              setPdfBlocked(null)
            }}
            options={[
              { value: 'file', label: 'Statement file' },
              { value: 'sms', label: 'Paste SMS' },
            ]}
          />

          {mode === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cx('flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors', dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-panel-2/50')}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon name="file" size={20} />
              </span>
              <p className="mt-3 text-sm font-medium">Drop a bank statement here</p>
              <p className="mt-1 text-xs text-muted">CSV or PDF · up to 10 MB</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon="upload" onClick={() => fileRef.current?.click()}>
                  Choose file
                </Button>
                <Button variant="ghost" onClick={() => process(() => parseCsv(SAMPLE_CSV), 'csv')}>
                  Try a sample CSV
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.pdf,text/csv,application/pdf"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea rows={6} value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Paste one or more bank / UPI SMS alerts. Separate messages with a blank line." className="font-mono text-xs" />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" icon="sparkles" disabled={!sms.trim()} onClick={() => process(() => parseSms(sms), 'sms')}>
                  Extract transactions
                </Button>
                <Button variant="ghost" onClick={() => setSms(SAMPLE_SMS)}>
                  Paste sample SMS
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-2 text-sm text-danger" role="alert">
              <Icon name="alert" size={14} /> {error}
            </p>
          )}
          {pdfBlocked && (
            <DemoNotice icon="lock">
              <b className="font-medium text-fg">PDF statements need the Finora backend parser, which isn't connected yet.</b> "{pdfBlocked}" was not read or uploaded. You can export a CSV from your bank instead, or{' '}
              <button className="font-medium text-accent hover:underline" onClick={loadSamplePdf}>
                view a sample extraction (demo data)
              </button>{' '}
              to see how the review step works.
            </DemoNotice>
          )}
          <p className="text-[11px] text-faint">
            <Icon name="lock" size={11} className="mr-1 inline" />
            CSV and SMS are processed entirely in your browser - nothing is uploaded. Finora never connects to your bank account.
          </p>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted">
          <Spinner size={22} />
          Reading {fileName && mode === 'file' ? `"${fileName}"` : 'messages'} and extracting transactions…
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="ok" dot>
              {rows.length} extracted
            </Badge>
            {rows.some((r) => r.duplicate) && <Badge tone="warn">{rows.filter((r) => r.duplicate).length} possible duplicates (unticked)</Badge>}
            {rows.some((r) => r.ruleId) && <Badge tone="violet">{rows.filter((r) => r.ruleId).length} categorised by your rules</Badge>}
            {rows.some((r) => r.sample) && <Badge tone="warn">Sample extraction</Badge>}
          </div>
          {warnings.map((w) => (
            <p key={w} className="text-xs text-warn">
              {w}
            </p>
          ))}
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-panel-2 text-left text-xs text-faint">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input type="checkbox" aria-label="Select all" className="size-4" checked={included.length === rows.length} onChange={(e) => setRows(rows.map((r) => ({ ...r, include: e.target.checked })))} />
                  </th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key} className={cx(!r.include && 'opacity-50')}>
                    <td className="px-3 py-2">
                      <input type="checkbox" aria-label={`Include ${r.description}`} className="size-4" checked={r.include} onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, include: e.target.checked } : x)))} />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted">{formatDate(r.date)}</td>
                    <td className="max-w-64 px-2 py-2">
                      <div className="truncate">{r.merchant}</div>
                      <div className="truncate text-[11px] text-faint">{r.description}</div>
                      {r.duplicate && <div className="text-[11px] text-warn">Looks like an existing transaction</div>}
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={r.category}
                        onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, category: e.target.value as CategoryId, ruleId: undefined } : x)))}
                        className="field h-8 py-0 text-xs"
                        aria-label="Category"
                      >
                        {(r.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {r.ruleId && <div className="mt-0.5 text-[10px] text-violet">via your rule</div>}
                    </td>
                    <td className={cx('num px-3 py-2 text-right font-medium whitespace-nowrap', r.type === 'income' ? 'text-ok' : '')}>
                      {r.type === 'income' ? '+' : '−'}
                      {inrPrecise(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" icon="chevronLeft" onClick={reset}>
              Start over
            </Button>
            <Button variant="primary" icon="check" loading={saving} disabled={!included.length} onClick={confirm}>
              Confirm & import {included.length}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-ok-soft text-ok">
            <Icon name="check" size={22} />
          </span>
          <p className="font-medium">
            Imported {importedCount} transaction{importedCount === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-muted">Your dashboard, analytics and alerts have been updated.</p>
          <div className="flex gap-2">
            <Button onClick={reset}>Import more</Button>
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
