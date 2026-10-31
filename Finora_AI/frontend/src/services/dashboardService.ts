// Dashboard view-model.
// Local mode: computed in the browser from the snapshot (utils/finance.ts).
// Computed in the browser from the loaded data (API or local). Backend GET /api/dashboard exists but is not used here.

import type { FinanceSnapshot, MonthKey } from '../types/finance'
import { addMonths } from '../utils/dates'
import {
  budgetUtilization,
  categoryBreakdown,
  cumulativeDailySpend,
  emergencyFundStatus,
  goalProgress,
  healthScore,
  lastNMonths,
  nextPayment,
  recurringTotals,
  summarizeMonth,
  summarizeMonths,
} from '../utils/finance'

export function buildDashboard(data: FinanceSnapshot, month: MonthKey) {
  const summary = summarizeMonth(data.transactions, month)
  const previous = summarizeMonth(data.transactions, addMonths(month, -1))
  const trend = summarizeMonths(data.transactions, lastNMonths(month, 6))
  const recent = trend.slice(-3)
  const upcoming = data.subscriptions
    .map((s) => ({ sub: s, next: nextPayment(s) }))
    .filter((x): x is { sub: typeof x.sub; next: string } => !!x.next)
    .sort((a, b) => a.next.localeCompare(b.next))
  return {
    summary,
    previous,
    trend,
    categories: categoryBreakdown(summary),
    budget: budgetUtilization(summary, data.profile),
    emergency: emergencyFundStatus(data.profile, recent),
    health: healthScore({ summary, recent, profile: data.profile, goals: data.goals }),
    daily: cumulativeDailySpend(data.transactions, month),
    dailyPrevious: cumulativeDailySpend(data.transactions, addMonths(month, -1)),
    recurring: recurringTotals(data.subscriptions),
    upcoming,
    goals: data.goals.map((g) => ({ goal: g, ...goalProgress(g) })),
    recentTransactions: data.transactions.filter((t) => t.date.startsWith(month)).slice(0, 6),
  }
}
export type DashboardData = ReturnType<typeof buildDashboard>
