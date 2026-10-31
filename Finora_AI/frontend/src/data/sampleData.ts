// ⚠️ SAMPLE / DEMO DATA — not real bank data.
// Generates six months of realistic transactions for a fictional user so the
// app is explorable before real data is imported. Everything created here has
// `isSample: true` and the UI labels it. Delete it from Settings → Data.
//
// The most recent full month (the "anchor" month) is tuned to match the brief:
//   income ₹65,000 · expenses ₹38,000 · savings ₹27,000 · emergency fund ₹1,20,000
// Dates are generated relative to today so the demo never looks stale.

import type {
  AppSettings,
  CategoryId,
  Goal,
  MoneyProfile,
  MonthKey,
  PaymentMethod,
  Subscription,
  Transaction,
} from '../types/finance'
import { addMonths, daysInMonth, monthKey, toISODate, today } from '../utils/dates'

/** The latest month with a complete set of sample data. */
export function sampleAnchorMonth(now: Date = today()): MonthKey {
  const m = monthKey(now)
  return now.getDate() >= 25 ? m : addMonths(m, -1)
}

interface Row {
  day: number
  description: string
  merchant: string
  category: CategoryId
  amount: number
  method: PaymentMethod
  sub?: string
  type?: 'income'
}

// Anchor-month template. Expenses sum to exactly ₹38,000.
const ANCHOR_ROWS: Row[] = [
  { day: 1, description: 'Salary credit – Acme Technologies', merchant: 'Acme Technologies', category: 'salary', amount: 65000, method: 'Net Banking', type: 'income' },
  { day: 1, description: 'House rent', merchant: 'Landlord (Rent)', category: 'housing', amount: 15000, method: 'UPI' },
  { day: 2, description: 'BigBasket groceries', merchant: 'BigBasket', category: 'food', amount: 2150, method: 'UPI' },
  { day: 3, description: 'Netflix Premium', merchant: 'Netflix', category: 'entertainment', amount: 649, method: 'Card', sub: 'sub_netflix' },
  { day: 4, description: 'Spotify Individual', merchant: 'Spotify', category: 'entertainment', amount: 119, method: 'Card', sub: 'sub_spotify' },
  { day: 5, description: 'ACT Fibernet broadband', merchant: 'ACT Fibernet', category: 'bills', amount: 999, method: 'Auto-debit', sub: 'sub_internet' },
  { day: 5, description: 'Google One 100 GB', merchant: 'Google One', category: 'bills', amount: 130, method: 'Card', sub: 'sub_cloud' },
  { day: 6, description: 'Cult.fit membership', merchant: 'Cult.fit', category: 'healthcare', amount: 1500, method: 'Auto-debit', sub: 'sub_gym' },
  { day: 7, description: 'BESCOM electricity bill', merchant: 'BESCOM', category: 'bills', amount: 1850, method: 'UPI' },
  { day: 8, description: 'Airtel prepaid recharge', merchant: 'Airtel', category: 'bills', amount: 399, method: 'UPI' },
  { day: 9, description: 'Swiggy – dinner order', merchant: 'Swiggy', category: 'food', amount: 640, method: 'UPI' },
  { day: 10, description: 'Uber – office commute', merchant: 'Uber', category: 'transport', amount: 460, method: 'UPI' },
  { day: 11, description: 'Amazon – headphones', merchant: 'Amazon', category: 'shopping', amount: 1899, method: 'Card' },
  { day: 12, description: 'Zomato – lunch', merchant: 'Zomato', category: 'food', amount: 820, method: 'UPI' },
  { day: 14, description: 'Dinner with friends – Toit', merchant: 'Toit', category: 'food', amount: 2100, method: 'Card' },
  { day: 15, description: 'Namma Metro card recharge', merchant: 'Namma Metro', category: 'transport', amount: 500, method: 'UPI' },
  { day: 16, description: 'PVR – movie tickets', merchant: 'PVR Cinemas', category: 'entertainment', amount: 720, method: 'UPI' },
  { day: 17, description: 'Apollo Pharmacy', merchant: 'Apollo Pharmacy', category: 'healthcare', amount: 620, method: 'UPI' },
  { day: 18, description: 'Udemy – React course', merchant: 'Udemy', category: 'education', amount: 1299, method: 'Card' },
  { day: 19, description: 'BigBasket groceries', merchant: 'BigBasket', category: 'food', amount: 1480, method: 'UPI' },
  { day: 20, description: 'Shell – fuel', merchant: 'Shell', category: 'transport', amount: 1200, method: 'Card' },
  { day: 21, description: 'Myntra – clothing', merchant: 'Myntra', category: 'shopping', amount: 1450, method: 'Card' },
  { day: 22, description: 'Plumber – kitchen repair', merchant: 'Local services', category: 'other', amount: 1466, method: 'Cash' },
  { day: 23, description: 'Swiggy Instamart', merchant: 'Swiggy Instamart', category: 'food', amount: 310, method: 'UPI' },
  { day: 26, description: 'Rapido – bike taxi', merchant: 'Rapido', category: 'transport', amount: 240, method: 'UPI' },
]

// History multipliers per months-ago (index 0 = 1 month before anchor).
const FACTORS: Partial<Record<CategoryId, number[]>> = {
  food: [0.86, 0.9, 1.04, 0.82, 0.78],
  shopping: [1.35, 0.7, 1.9, 0.85, 1.1],
  transport: [1.05, 0.95, 1.12, 0.9, 1.0],
  entertainment: [0.7, 1.2, 0.5, 1.0, 0.8],
  healthcare: [0.4, 1.6, 0.5, 0.4, 1.2],
  other: [0.5, 0, 2.2, 0.3, 0],
  education: [0, 1, 0, 0, 0],
}
// Electricity varies with the season; Netflix was ₹499 before the latest bill.
const ELECTRICITY = [1600, 1720, 1940, 2280, 2450]
const FREELANCE: Record<number, number> = { 2: 12000, 4: 6500 }

const round10 = (n: number) => Math.round(n / 10) * 10

function rowsForMonth(monthsAgo: number): Row[] {
  if (monthsAgo === 0) return ANCHOR_ROWS
  const i = monthsAgo - 1
  const rows: Row[] = []
  for (const r of ANCHOR_ROWS) {
    if (r.sub || r.category === 'housing' || r.type === 'income' || r.merchant === 'Airtel') {
      let amount = r.amount
      if (r.sub === 'sub_netflix') amount = 499
      rows.push({ ...r, amount })
      continue
    }
    if (r.merchant === 'BESCOM') {
      rows.push({ ...r, amount: ELECTRICITY[i] })
      continue
    }
    const f = FACTORS[r.category]?.[i] ?? 1
    if (f === 0) continue
    rows.push({ ...r, amount: round10(r.amount * f) })
  }
  if (FREELANCE[monthsAgo]) {
    rows.push({ day: 24, description: 'Freelance – UI design project', merchant: 'Freelance client', category: 'other', amount: FREELANCE[monthsAgo], method: 'Net Banking', type: 'income' })
  }
  return rows
}

export const SAMPLE_HISTORY_MONTHS = 6

export function buildSampleTransactions(anchor: MonthKey = sampleAnchorMonth()): Transaction[] {
  const out: Transaction[] = []
  for (let ago = SAMPLE_HISTORY_MONTHS - 1; ago >= 0; ago--) {
    const m = addMonths(anchor, -ago)
    const last = daysInMonth(m)
    const label = new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' })
    rowsForMonth(ago).forEach((r, idx) => {
      out.push({
        id: `sample_${m}_${idx}`,
        date: `${m}-${String(Math.min(r.day, last)).padStart(2, '0')}`,
        description: r.category === 'housing' ? `House rent – ${label}` : r.description,
        merchant: r.merchant,
        amount: r.amount,
        type: r.type ?? 'expense',
        category: r.category,
        paymentMethod: r.method,
        source: 'sample',
        isSample: true,
        subscriptionId: r.sub,
      })
    })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

export function buildSampleSubscriptions(anchor: MonthKey = sampleAnchorMonth()): Subscription[] {
  const start = (day: number, monthsBack = SAMPLE_HISTORY_MONTHS - 1) => `${addMonths(anchor, -monthsBack)}-${String(day).padStart(2, '0')}`
  const base = { status: 'active' as const, isSample: true }
  return [
    { ...base, id: 'sub_netflix', name: 'Netflix Premium', category: 'entertainment', amount: 649, previousAmount: 499, frequency: 'monthly', billingStartDate: start(3), usage: 'often', paymentMethod: 'Card' },
    { ...base, id: 'sub_spotify', name: 'Spotify Individual', category: 'entertainment', amount: 119, frequency: 'monthly', billingStartDate: start(4), usage: 'often', paymentMethod: 'Card' },
    { ...base, id: 'sub_internet', name: 'ACT Fibernet (Internet)', category: 'bills', amount: 999, frequency: 'monthly', billingStartDate: start(5), usage: 'often', paymentMethod: 'Auto-debit' },
    { ...base, id: 'sub_cloud', name: 'Google One (Cloud Storage)', category: 'bills', amount: 130, frequency: 'monthly', billingStartDate: start(5), usage: 'sometimes', paymentMethod: 'Card' },
    { ...base, id: 'sub_gym', name: 'Cult.fit Gym Membership', category: 'healthcare', amount: 1500, frequency: 'monthly', billingStartDate: start(6), usage: 'rarely', paymentMethod: 'Auto-debit', notes: 'You marked this as rarely used.' },
    { ...base, id: 'sub_prime', name: 'Amazon Prime', category: 'shopping', amount: 1499, frequency: 'yearly', billingStartDate: `${addMonths(anchor, -10)}-14`, usage: 'sometimes', paymentMethod: 'Card' },
  ]
}

export function buildSampleProfile(): MoneyProfile {
  return {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    city: 'Bengaluru',
    incomeSources: [{ id: 'inc_salary', name: 'Salary – Acme Technologies', amount: 65000, kind: 'salary' }],
    fixedExpenses: [
      { id: 'fx_rent', name: 'Rent', amount: 15000, category: 'housing' },
      { id: 'fx_internet', name: 'Internet (ACT Fibernet)', amount: 999, category: 'bills' },
      { id: 'fx_mobile', name: 'Mobile plan (Airtel)', amount: 399, category: 'bills' },
      { id: 'fx_gym', name: 'Gym membership', amount: 1500, category: 'healthcare' },
    ],
    variableBudgets: {
      housing: 15000,
      food: 6000,
      bills: 3500,
      shopping: 4000,
      transport: 3000,
      healthcare: 2500,
      entertainment: 2000,
      education: 2000,
      other: 2000,
    },
    emergencyFund: 120000,
    savingsBalance: 85000,
    preferences: {
      savingsRateTarget: 35,
      emergencyFundMonths: 6,
      avoidNewDebt: true,
      prioritiseEmergencyFund: true,
      minimumBalance: 20000,
      constraints: 'Keep at least ₹20,000 in the savings account\nNo new EMIs or credit-card debt\nVisit family in Jaipur twice a year',
    },
    isSample: true,
    updatedAt: new Date().toISOString(),
  }
}

export function buildSampleGoals(anchor: MonthKey = sampleAnchorMonth()): Goal[] {
  const date = (monthsAhead: number) => `${addMonths(anchor, monthsAhead)}-28`
  const createdAt = new Date().toISOString()
  const base = { createdAt, isSample: true }
  return [
    { ...base, id: 'goal_emergency', name: 'Emergency fund (6 months)', kind: 'emergency', targetAmount: 200000, savedAmount: 120000, targetDate: date(8), monthlyContribution: 8000 },
    { ...base, id: 'goal_laptop', name: 'New laptop', kind: 'purchase', targetAmount: 50000, savedAmount: 18000, targetDate: date(5), monthlyContribution: 7000 },
    { ...base, id: 'goal_education', name: 'Master’s degree fund', kind: 'education', targetAmount: 200000, savedAmount: 35000, targetDate: date(14), monthlyContribution: 8000 },
    { ...base, id: 'goal_goa', name: 'Goa trip with friends', kind: 'travel', targetAmount: 40000, savedAmount: 8000, targetDate: date(7), monthlyContribution: 4000 },
  ]
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  locale: 'en-IN',
  notifications: {
    overspending: true,
    bill_increase: true,
    goal_behind: true,
    upcoming_payment: true,
    low_savings: true,
    price_increase: true,
    unused_subscription: true,
    budget_utilization: true,
  },
  budgetWarningThreshold: 90,
  coach: { responseStyle: 'detailed', showCalculations: true },
}

/** Used by the PDF "sample extraction" in the upload flow (PDF parsing needs the backend). */
export function sampleStatementRows(): Omit<Transaction, 'id'>[] {
  const t = today()
  const d = (n: number) => toISODate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - n))
  const base = { source: 'pdf' as const, isSample: true, paymentMethod: 'UPI' as const }
  return [
    { ...base, date: d(1), description: 'UPI/ZOMATO/Order 88213', merchant: 'Zomato', amount: 455, type: 'expense', category: 'food' },
    { ...base, date: d(2), description: 'UPI/OLA CABS/Ride', merchant: 'Ola', amount: 318, type: 'expense', category: 'transport' },
    { ...base, date: d(3), description: 'POS/DMART/Whitefield', merchant: 'DMart', amount: 1840, type: 'expense', category: 'other' },
    { ...base, date: d(4), description: 'NEFT/REFUND/Amazon Seller', merchant: 'Amazon', amount: 899, type: 'income', category: 'other' },
  ]
}
