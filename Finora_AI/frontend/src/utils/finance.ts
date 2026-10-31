// Pure financial calculations. Every number the UI shows is derived here
// from transactions / profile / goals - nothing is hardcoded. These functions
// have no side effects, so a backend can later reproduce them exactly.

import { EXPENSE_CATEGORIES } from '../data/categories'
import type { CategoryId, Goal, MonthKey, MonthSummary, MoneyProfile, Subscription, Transaction } from '../types/finance'
import { addMonths, daysInMonth, monthKey, monthRange, monthsUntil, nextOccurrence, parseISODate, previousOccurrence, toISODate, today } from './dates'

/* ------------------------------------------------------------------ */
/* Monthly summaries                                                    */
/* ------------------------------------------------------------------ */

export function summarizeMonth(txns: Transaction[], month: MonthKey): MonthSummary {
  let income = 0
  let expenses = 0
  let count = 0
  const byCategory: Partial<Record<CategoryId, number>> = {}
  for (const t of txns) {
    if (!t.date.startsWith(month)) continue
    count++
    if (t.type === 'income') income += t.amount
    else {
      expenses += t.amount
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
    }
  }
  const savings = income - expenses
  return { month, income, expenses, savings, savingsRate: income > 0 ? (savings / income) * 100 : 0, byCategory, transactionCount: count }
}

export const summarizeMonths = (txns: Transaction[], months: MonthKey[]) => months.map((m) => summarizeMonth(txns, m))

/** Months that contain at least one transaction, oldest → newest */
export function availableMonths(txns: Transaction[]): MonthKey[] {
  return [...new Set(txns.map((t) => monthKey(t.date)))].sort()
}

/** The `n` months ending at `end` (inclusive), oldest first */
export const lastNMonths = (end: MonthKey, n: number) => monthRange(addMonths(end, -(n - 1)), end)

export interface CategoryShare {
  category: CategoryId
  amount: number
  share: number
}
export function categoryBreakdown(summary: MonthSummary): CategoryShare[] {
  const total = summary.expenses || 1
  return (Object.entries(summary.byCategory) as [CategoryId, number][])
    .map(([category, amount]) => ({ category, amount, share: (amount / total) * 100 }))
    .sort((a, b) => b.amount - a.amount)
}

/** Average monthly spend for one category over the `n` months ending at `end` */
export function averageCategorySpend(txns: Transaction[], category: CategoryId, end: MonthKey, n = 3) {
  const months = lastNMonths(end, n)
  const total = summarizeMonths(txns, months).reduce((s, m) => s + (m.byCategory[category] ?? 0), 0)
  return total / n
}

export const pctChange = (current: number, previous: number) => (previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100)

/* ------------------------------------------------------------------ */
/* Profile & budgets                                                    */
/* ------------------------------------------------------------------ */

export const profileIncome = (p: MoneyProfile) => p.incomeSources.reduce((s, i) => s + i.amount, 0)
export const profileFixed = (p: MoneyProfile) => p.fixedExpenses.reduce((s, f) => s + f.amount, 0)
export const totalBudget = (p: MoneyProfile) => Object.values(p.variableBudgets).reduce((s, v) => s + (v ?? 0), 0)

export interface BudgetRow {
  category: CategoryId
  spent: number
  budget: number
  /** spent / budget in % (Infinity-safe: 0 budget with spend → 100+) */
  utilization: number
}
export function budgetUtilization(summary: MonthSummary, profile: MoneyProfile): { rows: BudgetRow[]; spent: number; budget: number; utilization: number } {
  const rows: BudgetRow[] = EXPENSE_CATEGORIES.filter((c) => c.id !== 'investments')
    .map((c) => {
      const spent = summary.byCategory[c.id] ?? 0
      const budget = profile.variableBudgets[c.id] ?? 0
      return { category: c.id, spent, budget, utilization: budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0 }
    })
    .filter((r) => r.budget > 0 || r.spent > 0)
    .sort((a, b) => b.utilization - a.utilization)
  const budget = totalBudget(profile)
  return { rows, spent: summary.expenses, budget, utilization: budget > 0 ? (summary.expenses / budget) * 100 : 0 }
}

/** Average monthly essential spend (housing, food, bills, transport, healthcare) */
export function essentialMonthlySpend(summaries: MonthSummary[]) {
  if (summaries.length === 0) return 0
  const essential = EXPENSE_CATEGORIES.filter((c) => c.essential).map((c) => c.id)
  const total = summaries.reduce((s, m) => s + essential.reduce((a, id) => a + (m.byCategory[id] ?? 0), 0), 0)
  return total / summaries.length
}

export function emergencyFundStatus(profile: MoneyProfile, recent: MonthSummary[]) {
  const monthly = essentialMonthlySpend(recent)
  const target = monthly * profile.preferences.emergencyFundMonths
  const monthsCovered = monthly > 0 ? profile.emergencyFund / monthly : 0
  return {
    monthlyEssential: monthly,
    target,
    monthsCovered,
    progress: target > 0 ? Math.min(100, (profile.emergencyFund / target) * 100) : 0,
    shortfall: Math.max(0, target - profile.emergencyFund),
  }
}

/* ------------------------------------------------------------------ */
/* Financial health score (0-100, transparent and explainable)          */
/* ------------------------------------------------------------------ */

export interface HealthFactor {
  label: string
  score: number
  max: number
  detail: string
}
export interface HealthScore {
  score: number
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs attention'
  factors: HealthFactor[]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function healthScore(args: {
  summary: MonthSummary
  recent: MonthSummary[]
  profile: MoneyProfile
  goals: Goal[]
}): HealthScore {
  const { summary, recent, profile, goals } = args
  const income = summary.income || profileIncome(profile)
  const target = profile.preferences.savingsRateTarget || 20
  const ef = emergencyFundStatus(profile, recent)
  const budget = budgetUtilization(summary, profile)
  const overBudget = budget.rows.filter((r) => r.budget > 0 && r.spent > r.budget).length
  const onTrack = goals.length ? goals.filter((g) => goalProgress(g).onTrack).length / goals.length : 1
  const fixedRatio = income > 0 ? profileFixed(profile) / income : 1

  const factors: HealthFactor[] = [
    { label: 'Savings rate', max: 30, score: 30 * clamp01(summary.savingsRate / target), detail: `${summary.savingsRate.toFixed(1)}% vs ${target}% target` },
    {
      label: 'Emergency fund',
      max: 25,
      score: 25 * clamp01(ef.monthsCovered / profile.preferences.emergencyFundMonths),
      detail: `${ef.monthsCovered.toFixed(1)} of ${profile.preferences.emergencyFundMonths} months covered`,
    },
    {
      label: 'Budget discipline',
      max: 20,
      score: 20 * clamp01(1 - Math.max(0, budget.utilization - 100) / 50) * (overBudget === 0 ? 1 : overBudget === 1 ? 0.8 : 0.6),
      detail: `${budget.utilization.toFixed(0)}% of budget used · ${overBudget} categor${overBudget === 1 ? 'y' : 'ies'} over`,
    },
    { label: 'Goals on track', max: 15, score: 15 * onTrack, detail: `${Math.round(onTrack * goals.length)} of ${goals.length} goals on schedule` },
    { label: 'Fixed-cost load', max: 10, score: 10 * clamp01((0.6 - fixedRatio) / 0.3), detail: `Fixed costs are ${(fixedRatio * 100).toFixed(0)}% of income` },
  ]
  const score = Math.round(factors.reduce((s, f) => s + f.score, 0))
  const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Needs attention'
  return { score, grade, factors: factors.map((f) => ({ ...f, score: Math.round(f.score) })) }
}

/* ------------------------------------------------------------------ */
/* Goals                                                                */
/* ------------------------------------------------------------------ */

export interface GoalProgress {
  progress: number
  remaining: number
  monthsLeft: number
  /** Contribution needed per month to hit the target date */
  requiredMonthly: number
  /** Months to completion at the current contribution (Infinity if none) */
  monthsToComplete: number
  projectedDate: string | null
  onTrack: boolean
}

/** Date `months` whole months from today (end of that month), or null */
export function projectDate(months: number): string | null {
  if (!Number.isFinite(months)) return null
  const t = today()
  return toISODate(new Date(t.getFullYear(), t.getMonth() + months + 1, 0))
}

export function goalProgress(goal: Goal, extraMonthly = 0): GoalProgress {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
  const monthsLeft = monthsUntil(goal.targetDate)
  const contribution = goal.monthlyContribution + extraMonthly
  const monthsToComplete = remaining === 0 ? 0 : contribution > 0 ? Math.ceil(remaining / contribution) : Infinity
  return {
    progress: goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0,
    remaining,
    monthsLeft,
    requiredMonthly: remaining === 0 ? 0 : remaining / Math.max(1, monthsLeft),
    monthsToComplete,
    projectedDate: projectDate(monthsToComplete),
    onTrack: monthsToComplete <= Math.max(monthsLeft, 0) || remaining === 0,
  }
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                        */
/* ------------------------------------------------------------------ */

const PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }
export const monthlyEquivalent = (s: Subscription) => s.amount * PER_MONTH[s.frequency]
export const nextPayment = (s: Subscription) => (s.status === 'active' ? nextOccurrence(s.billingStartDate, s.frequency) : null)
export const lastPayment = (s: Subscription) => previousOccurrence(s.billingStartDate, s.frequency)

export function recurringTotals(subs: Subscription[]) {
  const active = subs.filter((s) => s.status === 'active')
  const monthly = active.reduce((sum, s) => sum + monthlyEquivalent(s), 0)
  return { monthly, yearly: monthly * 12, activeCount: active.length }
}

/* ------------------------------------------------------------------ */
/* What-if simulations                                                  */
/* ------------------------------------------------------------------ */

export function simulateCategoryCut(currentMonthly: number, reductionPct: number) {
  const newMonthly = currentMonthly * (1 - reductionPct / 100)
  const monthlySaving = currentMonthly - newMonthly
  return { newMonthly, monthlySaving, annualSaving: monthlySaving * 12 }
}

export function simulateExpenseChange(args: { income: number; expenses: number; change: number }) {
  const before = args.income - args.expenses
  const after = before - args.change
  return {
    disposableBefore: before,
    disposableAfter: after,
    savingsRateBefore: args.income > 0 ? (before / args.income) * 100 : 0,
    savingsRateAfter: args.income > 0 ? (after / args.income) * 100 : 0,
    annualImpact: args.change * 12,
  }
}

/* ------------------------------------------------------------------ */
/* Spending trend within a month                                        */
/* ------------------------------------------------------------------ */

/** Cumulative expense by day for a month: [{day, total}] */
export function cumulativeDailySpend(txns: Transaction[], month: MonthKey) {
  const days = daysInMonth(month)
  const perDay = new Array(days).fill(0)
  for (const t of txns) {
    if (t.type === 'expense' && t.date.startsWith(month)) perDay[parseISODate(t.date).getDate() - 1] += t.amount
  }
  let run = 0
  return perDay.map((v, i) => ({ day: i + 1, total: (run += v) }))
}

