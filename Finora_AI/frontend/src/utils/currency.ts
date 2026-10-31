// INR formatting with Indian digit grouping (₹1,20,000).

const full = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const precise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ₹65,000 */
export const inr = (value: number) => full.format(Math.round(value))

/** ₹1,234.50 - for transaction-level amounts that may have paise */
export const inrPrecise = (value: number) => (Number.isInteger(value) ? full.format(value) : precise.format(value))

/** Signed: +₹2,000 / −₹2,000 */
export const inrSigned = (value: number) => `${value >= 0 ? '+' : '−'}${inr(Math.abs(value))}`

/** Compact for axes and tight spaces: ₹65K, ₹1.2L, ₹2.4Cr */
export function inrCompact(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`
  return `${sign}₹${Math.round(abs)}`
}
const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''))

export const pct = (value: number, digits = 0) => `${value.toFixed(digits)}%`
