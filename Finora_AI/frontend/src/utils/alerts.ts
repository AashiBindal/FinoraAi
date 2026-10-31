// Smart alerts = transparent rules over the user's own data (no AI involved).
// Each alert has a deterministic id so its read/unread state persists.

import { categoryLabel } from '../data/categories'
import type { AppSettings, FinanceAlert, Goal, MonthKey, MoneyProfile, Subscription, Transaction } from '../types/finance'
import { inr } from './currency'
import { addMonths, daysUntil, formatDate, monthLabel, todayISO } from './dates'
import { budgetUtilization, emergencyFundStatus, goalProgress, lastNMonths, nextPayment, pctChange, summarizeMonth, summarizeMonths } from './finance'

interface AlertInput {
  month: MonthKey
  transactions: Transaction[]
  subscriptions: Subscription[]
  goals: Goal[]
  profile: MoneyProfile
  settings: AppSettings
  readIds: Set<string>
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 }

export function computeAlerts(input: AlertInput): FinanceAlert[] {
  const { month, transactions, subscriptions, goals, profile, settings, readIds } = input
  const alerts: Omit<FinanceAlert, 'read'>[] = []
  const summary = summarizeMonth(transactions, month)
  const monthEnd = `${month}-28`
  const today = todayISO()
  const alertDate = monthEnd < today ? monthEnd : today

  // 1. Overspending per category
  const budget = budgetUtilization(summary, profile)
  for (const r of budget.rows) {
    if (r.budget <= 0) continue
    if (r.utilization > 100) {
      const over = r.utilization - 100
      alerts.push({
        id: `overspending:${r.category}:${month}`,
        type: 'overspending',
        severity: over >= 20 ? 'high' : 'medium',
        title: `${categoryLabel(r.category)} is ${over.toFixed(0)}% above budget`,
        description: `You spent ${inr(r.spent)} on ${categoryLabel(r.category)} in ${monthLabel(month)} against a planned ${inr(r.budget)} (${inr(r.spent - r.budget)} over).`,
        date: alertDate,
        suggestedAction: `Review ${categoryLabel(r.category)} transactions or simulate a cut in the Goal Planner.`,
        actionHref: `/transactions?category=${r.category}&month=${month}`,
      })
    } else if (r.utilization >= settings.budgetWarningThreshold) {
      alerts.push({
        id: `budget_utilization:${r.category}:${month}`,
        type: 'budget_utilization',
        severity: 'low',
        title: `${categoryLabel(r.category)} budget ${r.utilization.toFixed(0)}% used`,
        description: `${inr(r.budget - r.spent)} left of your ${inr(r.budget)} ${categoryLabel(r.category)} budget for ${monthLabel(month)}.`,
        date: alertDate,
        suggestedAction: 'Hold off on non-essential purchases in this category until next month.',
        actionHref: '/analytics',
      })
    }
  }

  // 2. Bills that went up vs last month (same merchant, bills category)
  const prev = addMonths(month, -1)
  const billsNow = transactions.filter((t) => t.category === 'bills' && t.type === 'expense' && t.date.startsWith(month))
  for (const t of billsNow) {
    const before = transactions.find((p) => p.merchant === t.merchant && p.type === 'expense' && p.date.startsWith(prev))
    if (before && t.amount > before.amount * 1.05) {
      const change = pctChange(t.amount, before.amount)
      alerts.push({
        id: `bill_increase:${t.merchant}:${month}`,
        type: 'bill_increase',
        severity: change >= 20 ? 'medium' : 'low',
        title: `${t.merchant} bill up ${change.toFixed(0)}%`,
        description: `${inr(t.amount)} this month vs ${inr(before.amount)} in ${monthLabel(prev)}.`,
        date: t.date,
        suggestedAction: 'Check for a tariff change or unusually high usage.',
        actionHref: `/transactions?q=${encodeURIComponent(t.merchant)}`,
      })
    }
  }

  // 3. Goals behind schedule
  for (const g of goals) {
    const p = goalProgress(g)
    if (p.remaining > 0 && !p.onTrack) {
      const gap = p.requiredMonthly - g.monthlyContribution
      alerts.push({
        id: `goal_behind:${g.id}:${month}`,
        type: 'goal_behind',
        severity: g.kind === 'emergency' ? 'high' : 'medium',
        title: `${g.name} is behind schedule`,
        description: `At ${inr(g.monthlyContribution)}/month you'd finish ${p.projectedDate ? formatDate(p.projectedDate, { month: 'short', year: 'numeric' }) : 'never'}, after your ${formatDate(g.targetDate, { month: 'short', year: 'numeric' })} target.`,
        date: alertDate,
        suggestedAction: `Add about ${inr(gap)}/month, or move the target date.`,
        actionHref: '/goals',
      })
    }
  }

  // 4. Emergency fund below target (only if no emergency goal already covers it)
  const recent = summarizeMonths(transactions, lastNMonths(month, 3))
  const ef = emergencyFundStatus(profile, recent)
  if (ef.shortfall > 0 && !goals.some((g) => g.kind === 'emergency')) {
    alerts.push({
      id: `goal_behind:emergency-fund:${month}`,
      type: 'goal_behind',
      severity: ef.monthsCovered < 3 ? 'high' : 'medium',
      title: 'Emergency fund below target',
      description: `It covers ${ef.monthsCovered.toFixed(1)} months of essential expenses; your target is ${profile.preferences.emergencyFundMonths}.`,
      date: alertDate,
      suggestedAction: `Create an emergency-fund goal for the remaining ${inr(ef.shortfall)}.`,
      actionHref: '/goals',
    })
  }

  // 5. Savings below target
  const target = profile.preferences.savingsRateTarget
  if (summary.income > 0 && summary.savingsRate < target) {
    alerts.push({
      id: `low_savings:${month}`,
      type: 'low_savings',
      severity: summary.savingsRate < target / 2 ? 'high' : 'medium',
      title: 'Monthly savings below target',
      description: `You saved ${summary.savingsRate.toFixed(1)}% of income in ${monthLabel(month)}; your target is ${target}%.`,
      date: alertDate,
      suggestedAction: 'Ask the Finance Coach where to trim, or adjust your target in Money Profile.',
      actionHref: '/coach',
    })
  }

  // 6. Subscriptions: upcoming (next 7 days), price increases, self-reported low usage
  for (const s of subscriptions) {
    if (s.status !== 'active') continue
    const next = nextPayment(s)
    if (next) {
      const days = daysUntil(next)
      if (days >= 0 && days <= 7) {
        alerts.push({
          id: `upcoming_payment:${s.id}:${next}`,
          type: 'upcoming_payment',
          severity: 'info',
          title: `${s.name} renews ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
          description: `${inr(s.amount)} via ${s.paymentMethod} on ${formatDate(next, { day: 'numeric', month: 'short' })}.`,
          date: today,
          suggestedAction: 'Make sure the account has enough balance, or cancel if you no longer need it.',
          actionHref: '/subscriptions',
        })
      }
    }
    if (s.previousAmount && s.amount > s.previousAmount) {
      alerts.push({
        id: `price_increase:${s.id}:${s.amount}`,
        type: 'price_increase',
        severity: 'medium',
        title: `${s.name} price went up`,
        description: `${inr(s.previousAmount)} → ${inr(s.amount)} (+${pctChange(s.amount, s.previousAmount).toFixed(0)}%), about ${inr((s.amount - s.previousAmount) * 12)} more per year.`,
        date: alertDate,
        suggestedAction: 'Consider a cheaper plan or sharing a family plan.',
        actionHref: '/subscriptions',
      })
    }
    if (s.usage === 'rarely') {
      alerts.push({
        id: `unused_subscription:${s.id}`,
        type: 'unused_subscription',
        severity: 'low',
        title: `${s.name} may be unused`,
        description: `You marked this as rarely used. It costs ${inr(s.amount)} per ${s.frequency.replace('ly', '')}. (Finora doesn't track actual usage.)`,
        date: alertDate,
        suggestedAction: 'Pause or cancel it if you no longer need it.',
        actionHref: '/subscriptions',
      })
    }
  }

  return alerts
    .filter((a) => settings.notifications[a.type] !== false)
    .map((a) => ({ ...a, read: readIds.has(a.id) }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.date.localeCompare(a.date))
}
