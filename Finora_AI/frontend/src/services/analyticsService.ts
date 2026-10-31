// Analytics view-model for a range of months.
// Computed in the browser from the loaded data (API or local). Backend /api/analytics/* exists but is not used by these views.

import { EXPENSE_CATEGORIES } from '../data/categories'
import type { CategoryId, FinanceSnapshot, MonthKey } from '../types/finance'
import { addMonths, monthRange } from '../utils/dates'
import { budgetUtilization, pctChange, summarizeMonth, summarizeMonths } from '../utils/finance'

export function buildAnalytics(data: FinanceSnapshot, from: MonthKey, to: MonthKey) {
  const months = monthRange(from, to)
  const series = summarizeMonths(data.transactions, months)
  const totals = series.reduce(
    (acc, m) => {
      acc.income += m.income
      acc.expenses += m.expenses
      for (const [c, v] of Object.entries(m.byCategory) as [CategoryId, number][]) acc.byCategory[c] = (acc.byCategory[c] ?? 0) + v
      return acc
    },
    { income: 0, expenses: 0, byCategory: {} as Partial<Record<CategoryId, number>> },
  )
  const categoryTotals = (Object.entries(totals.byCategory) as [CategoryId, number][])
    .map(([category, amount]) => ({ category, amount, share: totals.expenses ? (amount / totals.expenses) * 100 : 0, monthlyAvg: amount / months.length }))
    .sort((a, b) => b.amount - a.amount)

  const current = series[series.length - 1] ?? summarizeMonth(data.transactions, to)
  const previous = summarizeMonth(data.transactions, addMonths(to, -1))
  const momRows = EXPENSE_CATEGORIES.map((c) => {
    const now = current.byCategory[c.id] ?? 0
    const before = previous.byCategory[c.id] ?? 0
    return { category: c.id, now, before, change: now - before, changePct: pctChange(now, before) }
  })
    .filter((r) => r.now > 0 || r.before > 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  const savings = totals.income - totals.expenses
  return {
    months,
    series,
    totals: { ...totals, savings, savingsRate: totals.income ? (savings / totals.income) * 100 : 0, avgMonthlyExpense: totals.expenses / months.length },
    categoryTotals,
    current,
    previous,
    momRows,
    budget: budgetUtilization(current, data.profile),
  }
}
export type AnalyticsData = ReturnType<typeof buildAnalytics>
