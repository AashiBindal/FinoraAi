// Monthly report view-model, including rule-based observations and a
// suggested budget for next month.
// Computed in the browser from the loaded data (API or local). The Spring backend also exposes
// GET /api/reports/monthly, but its DTO differs; the UI computes reports itself so both modes match.

import { categoryLabel, EXPENSE_CATEGORIES } from '../data/categories'
import type { CategoryId, FinanceSnapshot, MonthKey } from '../types/finance'
import { inr } from '../utils/currency'
import { addMonths, monthLabel } from '../utils/dates'
import {
  averageCategorySpend,
  budgetUtilization,
  categoryBreakdown,
  emergencyFundStatus,
  goalProgress,
  lastNMonths,
  pctChange,
  recurringTotals,
  summarizeMonth,
  summarizeMonths,
} from '../utils/finance'

export interface Observation {
  tone: 'ok' | 'warn' | 'info'
  text: string
}

export function buildReport(data: FinanceSnapshot, month: MonthKey) {
  const summary = summarizeMonth(data.transactions, month)
  const previous = summarizeMonth(data.transactions, addMonths(month, -1))
  const categories = categoryBreakdown(summary)
  const budget = budgetUtilization(summary, data.profile)
  const recurring = recurringTotals(data.subscriptions)
  const ef = emergencyFundStatus(data.profile, summarizeMonths(data.transactions, lastNMonths(month, 3)))
  const goals = data.goals.map((g) => ({ goal: g, ...goalProgress(g) }))

  const observations: Observation[] = []
  const target = data.profile.preferences.savingsRateTarget
  if (summary.income > 0) {
    observations.push(
      summary.savingsRate >= target
        ? { tone: 'ok', text: `You saved ${summary.savingsRate.toFixed(1)}% of income, above your ${target}% target.` }
        : { tone: 'warn', text: `You saved ${summary.savingsRate.toFixed(1)}% of income, below your ${target}% target.` },
    )
  }
  if (previous.expenses > 0) {
    const ch = pctChange(summary.expenses, previous.expenses)
    observations.push({ tone: ch > 5 ? 'warn' : 'info', text: `Total spending ${ch >= 0 ? 'rose' : 'fell'} ${Math.abs(ch).toFixed(1)}% vs ${monthLabel(addMonths(month, -1))}.` })
  }
  for (const r of budget.rows.filter((r) => r.budget > 0 && r.spent > r.budget).slice(0, 2)) {
    observations.push({ tone: 'warn', text: `${categoryLabel(r.category)} exceeded its budget by ${inr(r.spent - r.budget)} (${(r.utilization - 100).toFixed(0)}% over).` })
  }
  if (recurring.monthly > 0 && summary.expenses > 0) {
    observations.push({ tone: 'info', text: `Recurring payments are ${inr(recurring.monthly)}/month, ${((recurring.monthly / summary.expenses) * 100).toFixed(0)}% of spending.` })
  }
  observations.push(
    ef.shortfall > 0
      ? { tone: 'warn', text: `Emergency fund covers ${ef.monthsCovered.toFixed(1)} months; ${inr(ef.shortfall)} more reaches your ${data.profile.preferences.emergencyFundMonths}-month target.` }
      : { tone: 'ok', text: `Emergency fund fully covers your ${data.profile.preferences.emergencyFundMonths}-month target.` },
  )

  // Suggested budget: keep within budget where the user was disciplined,
  // otherwise meet halfway between the plan and the 3-month average.
  const suggested = EXPENSE_CATEGORIES.filter((c) => c.id !== 'investments')
    .map((c) => {
      const current = data.profile.variableBudgets[c.id] ?? 0
      const avg = averageCategorySpend(data.transactions, c.id, month, 3)
      const spent = summary.byCategory[c.id] ?? 0
      let next = current
      let reason = 'Keep as planned'
      if (current === 0 && avg > 0) {
        next = Math.round(avg / 100) * 100
        reason = 'No budget set - based on 3-month average'
      } else if (spent > current && current > 0) {
        next = Math.round(((current + avg) / 2) / 100) * 100
        reason = next > current ? 'Over budget - adjusted toward your real average' : 'Over budget this month - hold the line'
      } else if (avg > 0 && avg < current * 0.7) {
        next = Math.round((avg * 1.1) / 100) * 100
        reason = 'Consistently under - free up the difference for goals'
      }
      return { category: c.id as CategoryId, current, avg, next, reason }
    })
    .filter((r) => r.current > 0 || r.avg > 0)

  return {
    month,
    summary,
    previous,
    categories,
    biggest: categories[0] ?? null,
    budget,
    recurring,
    subscriptions: data.subscriptions.filter((s) => s.status === 'active'),
    emergency: ef,
    goals,
    observations,
    suggested,
    suggestedTotal: suggested.reduce((s, r) => s + r.next, 0),
    generatedAt: new Date().toISOString(),
  }
}
export type ReportData = ReturnType<typeof buildReport>
