// In-browser parsers for the upload flow.
//   CSV  → real parsing (common bank export layouts)
//   SMS  → real parsing (common Indian bank/UPI alert formats)
//   PDF  → NOT parsed in the browser; needs the backend statement parser.
// Results are always shown for review before anything is saved.

import type { ISODate, PaymentMethod, TransactionType } from '../types/finance'
import { toISODate, todayISO } from './dates'

export interface ParsedRow {
  date: ISODate
  description: string
  merchant: string
  amount: number
  type: TransactionType
  paymentMethod: PaymentMethod
}
export interface ParseResult {
  rows: ParsedRow[]
  skipped: number
  warnings: string[]
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export type UploadKind = 'csv' | 'pdf'

export function detectUploadKind(file: File): UploadKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') return 'csv'
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  return null
}

/* ---------------- dates ---------------- */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Accepts 2026-10-05, 05/10/2026, 05-10-26, 05 Oct 2026, 05-Oct-26 (day-first, Indian format) */
export function parseLooseDate(raw: string): ISODate | null {
  const s = raw.trim().toLowerCase()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return make(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2,4})/.exec(s)
  if (m) return make(year(m[3]), +m[2], +m[1])
  m = /^(\d{1,2})[\- ]?([a-z]{3})[a-z]*[\-, ]+(\d{2,4})/.exec(s)
  if (m && MONTHS.includes(m[2])) return make(year(m[3]), MONTHS.indexOf(m[2]) + 1, +m[1])
  return null
}
const year = (y: string) => (y.length === 2 ? 2000 + +y : +y)
function make(y: number, mo: number, d: number): ISODate | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(y, mo - 1, d)
  return date.getMonth() === mo - 1 ? toISODate(date) : null
}

const num = (s: string | undefined) => {
  if (!s) return NaN
  const cleaned = s.replace(/[₹,\s]|inr|rs\.?/gi, '').replace(/\((.*)\)/, '-$1')
  return cleaned ? parseFloat(cleaned) : NaN
}

function methodFrom(text: string): PaymentMethod {
  const t = text.toLowerCase()
  if (t.includes('upi') || t.includes('vpa')) return 'UPI'
  if (t.includes('pos') || t.includes('card')) return 'Card'
  if (t.includes('neft') || t.includes('imps') || t.includes('rtgs')) return 'Net Banking'
  if (t.includes('nach') || t.includes('ecs') || t.includes('auto')) return 'Auto-debit'
  if (t.includes('atm') || t.includes('cash')) return 'Cash'
  return 'Other'
}

/** "UPI/SWIGGY/Order 123" → "Swiggy" */
export function merchantFrom(description: string) {
  const parts = description.split(/[/|*]/).map((p) => p.trim()).filter(Boolean)
  const generic = /^(upi|pos|neft|imps|rtgs|nach|ecs|atm|vpa|ref|txn|dr|cr|\d+)$/i
  const pick = parts.find((p) => !generic.test(p) && /[a-z]/i.test(p)) ?? description
  const clean = pick.replace(/@.*$/, '').replace(/[^a-z0-9 .&'-]/gi, ' ').replace(/\s+/g, ' ').trim()
  return clean.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40) || 'Unknown'
}

/* ---------------- CSV ---------------- */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else quoted = !quoted
    } else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

// Short names ("dr", "cr") must match a whole word, so "description" isn't read as "cr".
const find = (headers: string[], names: string[]) =>
  headers.findIndex((h) => names.some((n) => (n.length <= 3 ? new RegExp(`\\b${n}\\b`).test(h) : h.includes(n))))

export function parseCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const warnings: string[] = []
  if (lines.length < 2) return { rows: [], skipped: 0, warnings: ['The file has no data rows.'] }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const iDate = find(headers, ['date'])
  const iDesc = find(headers, ['description', 'narration', 'particulars', 'details', 'remarks', 'merchant'])
  const iAmount = find(headers, ['amount'])
  const iDebit = find(headers, ['debit', 'withdrawal', 'dr'])
  const iCredit = find(headers, ['credit', 'deposit', 'cr'])
  const iType = find(headers, ['type'])

  if (iDate < 0 || iDesc < 0 || (iAmount < 0 && iDebit < 0 && iCredit < 0)) {
    return {
      rows: [],
      skipped: lines.length - 1,
      warnings: ['Could not find the columns. Expected headers like: Date, Description, Amount (or Debit / Credit).'],
    }
  }

  const signed = iAmount >= 0 && lines.slice(1).some((l) => num(splitCsvLine(l)[iAmount]) < 0)
  const rows: ParsedRow[] = []
  let skipped = 0
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line)
    const date = parseLooseDate(c[iDate] ?? '')
    const description = (c[iDesc] ?? '').trim()
    let amount = NaN
    let type: TransactionType = 'expense'
    if (iDebit >= 0 || iCredit >= 0) {
      const dr = num(c[iDebit])
      const cr = num(c[iCredit])
      if (!Number.isNaN(dr) && dr !== 0) amount = Math.abs(dr)
      else if (!Number.isNaN(cr) && cr !== 0) {
        amount = Math.abs(cr)
        type = 'income'
      }
    }
    if (Number.isNaN(amount) && iAmount >= 0) {
      const a = num(c[iAmount])
      if (!Number.isNaN(a)) {
        const t = (c[iType] ?? '').toLowerCase()
        if (t) type = t.startsWith('cr') || t.includes('credit') || t.includes('income') ? 'income' : 'expense'
        // No type column: signed files use negative = debit; unsigned files are treated as spending
        else type = signed && a > 0 ? 'income' : 'expense'
        amount = Math.abs(a)
      }
    }
    if (!date || !description || Number.isNaN(amount) || amount <= 0) {
      skipped++
      continue
    }
    rows.push({ date, description, merchant: merchantFrom(description), amount: Math.round(amount * 100) / 100, type, paymentMethod: methodFrom(description) })
  }
  if (skipped) warnings.push(`${skipped} row${skipped === 1 ? '' : 's'} skipped (missing date, description or amount).`)
  return { rows, skipped, warnings }
}

/* ---------------- SMS ---------------- */
const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
const DEBIT_RE = /\b(debited|spent|paid|sent|withdrawn|purchase|dr\b)/i
const CREDIT_RE = /\b(credited|received|deposited|refund|cr\b)/i
const DATE_RE = /(\d{1,2}[-/ ](?:\d{1,2}|[a-z]{3})[a-z]*[-/ ,]+\d{2,4}|\d{4}-\d{2}-\d{2})/i
const MERCHANT_RES = [/(?:to|at)\s+vpa\s+([\w.\-@]+)/i, /\bto\s+([A-Za-z][\w &.'-]{2,30}?)(?:\s+on\b|\s+ref\b|\.|,|$)/i, /\bat\s+([A-Za-z][\w &.'-]{2,30}?)(?:\s+on\b|\.|,|$)/i, /info[:\s]+([\w &.'/-]{3,30})/i, /from\s+([A-Za-z][\w &.'-]{2,30}?)(?:\s+on\b|\.|,|$)/i]

export function parseSms(text: string): ParseResult {
  const messages = text
    .split(/\n\s*\n|\r?\n(?=.*(?:rs\.?|inr|₹))/i)
    .map((m) => m.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const rows: ParsedRow[] = []
  let skipped = 0
  for (const msg of messages) {
    const a = AMOUNT_RE.exec(msg)
    const isDebit = DEBIT_RE.test(msg)
    const isCredit = CREDIT_RE.test(msg)
    if (!a || (!isDebit && !isCredit)) {
      skipped++
      continue
    }
    const amount = parseFloat(a[1].replace(/,/g, ''))
    const d = DATE_RE.exec(msg)
    let merchant = 'Unknown'
    for (const re of MERCHANT_RES) {
      const m = re.exec(msg)
      if (m) {
        merchant = merchantFrom(m[1])
        break
      }
    }
    const type: TransactionType = isDebit && !(isCredit && msg.search(CREDIT_RE) < msg.search(DEBIT_RE)) ? 'expense' : 'income'
    rows.push({
      date: (d && parseLooseDate(d[1])) || todayISO(),
      description: msg.length > 80 ? `${msg.slice(0, 77)}…` : msg,
      merchant,
      amount,
      type,
      paymentMethod: methodFrom(msg),
    })
  }
  const warnings = skipped ? [`${skipped} message${skipped === 1 ? '' : 's'} didn't look like a transaction alert and were skipped.`] : []
  return { rows, skipped, warnings }
}

export const SAMPLE_SMS = `Rs.450.00 debited from A/c XX4521 on 28-10-26 to VPA swiggy@icici UPI Ref 629812345. Not you? Call 1800...

INR 1,299.00 spent on HDFC Bank Card XX9087 at AMAZON on 27-Oct-26. Avl limit: INR 85,000

Your A/c XX4521 is credited with Rs.2,500.00 on 26-10-26 from RAHUL K (UPI Ref 112233). -SBI`

export const SAMPLE_CSV = `Date,Description,Debit,Credit
28/10/2026,UPI/SWIGGY/Order 4411,385.00,
27/10/2026,POS/DECATHLON/Bengaluru,2199.00,
26/10/2026,NEFT/Freelance payment,,8000.00
25/10/2026,UPI/UBER/Trip,312.50,`
