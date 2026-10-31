// Date helpers. All dates are local calendar dates ("YYYY-MM-DD"); we avoid
// UTC parsing so a date never shifts by a day in IST.

import type { BillingFrequency, ISODate, MonthKey } from '../types/finance'

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISODate = (s: ISODate) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
export const today = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
export const todayISO = () => toISODate(today())

export const monthKey = (d: Date | ISODate): MonthKey => (typeof d === 'string' ? d.slice(0, 7) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
export const monthStart = (m: MonthKey) => parseISODate(`${m}-01`)
export const addMonths = (m: MonthKey, n: number): MonthKey => {
  const d = monthStart(m)
  return monthKey(new Date(d.getFullYear(), d.getMonth() + n, 1))
}
export const daysInMonth = (m: MonthKey) => {
  const d = monthStart(m)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}
/** Inclusive list of months from `from` to `to` */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

export const monthLabel = (m: MonthKey, style: 'long' | 'short' = 'long') =>
  monthStart(m).toLocaleDateString('en-IN', { month: style, year: style === 'long' ? 'numeric' : '2-digit' })
export const monthShort = (m: MonthKey) => monthStart(m).toLocaleDateString('en-IN', { month: 'short' })

/** "3 Nov" (adds the year when it isn't the current year: "14 Dec 2025") */
export function formatDate(s: ISODate | undefined | null, opts?: Intl.DateTimeFormatOptions) {
  if (!s) return '—'
  const d = parseISODate(s)
  const o = opts ?? (d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  return d.toLocaleDateString('en-IN', o)
}
export const formatDateLong = (s: ISODate) => formatDate(s, { day: 'numeric', month: 'short', year: 'numeric' })

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)
export const daysUntil = (s: ISODate) => daysBetween(today(), parseISODate(s))

/** Whole months from today until a date (min 0) */
export function monthsUntil(s: ISODate) {
  const t = today()
  const d = parseISODate(s)
  return Math.max(0, (d.getFullYear() - t.getFullYear()) * 12 + (d.getMonth() - t.getMonth()))
}

const STEP: Record<BillingFrequency, (d: Date, n: number) => Date> = {
  weekly: (d, n) => addDays(d, 7 * n),
  monthly: (d, n) => addMonthsClamped(d, n),
  quarterly: (d, n) => addMonthsClamped(d, 3 * n),
  yearly: (d, n) => addMonthsClamped(d, 12 * n),
}
/** Add months keeping the day where possible (31 Jan + 1 → 28/29 Feb) */
function addMonthsClamped(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last))
}

/** Next billing date on/after `from` for a schedule starting at `start` */
export function nextOccurrence(start: ISODate, freq: BillingFrequency, from: Date = today()): ISODate {
  const s = parseISODate(start)
  if (s >= from) return toISODate(s)
  let n = 0
  let d = s
  // Jump close to `from` first to keep this cheap for old start dates
  if (freq !== 'weekly') {
    const months = (from.getFullYear() - s.getFullYear()) * 12 + (from.getMonth() - s.getMonth())
    const per = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12
    n = Math.max(0, Math.floor(months / per) - 1)
    d = STEP[freq](s, n)
  } else {
    n = Math.max(0, Math.floor(daysBetween(s, from) / 7) - 1)
    d = STEP.weekly(s, n)
  }
  while (d < from) d = STEP[freq](s, ++n)
  return toISODate(d)
}

/** Most recent billing date strictly before `from` (null if none yet) */
export function previousOccurrence(start: ISODate, freq: BillingFrequency, from: Date = today()): ISODate | null {
  const next = parseISODate(nextOccurrence(start, freq, from))
  const s = parseISODate(start)
  if (next <= s) return null
  // step back one period from `next`
  const prev = freq === 'weekly' ? addDays(next, -7) : addMonthsClamped(next, freq === 'monthly' ? -1 : freq === 'quarterly' ? -3 : -12)
  return prev < s ? null : toISODate(prev)
}

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
