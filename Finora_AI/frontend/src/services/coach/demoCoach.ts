// ⚠️ DEMO COACH — rule-based, NOT an AI model.
// Answers a fixed set of question types by calculating from the user's own
// data. Every reply is marked `source: 'demo'` and labelled in the UI.
// Replace with a real model via financeCoachService (COACH_MODE=api).

import { categoryLabel } from '../../data/categories'
import type { CategoryId, CoachMessage, FinanceSnapshot, MonthKey } from '../../types/finance'
import { inr, pct } from '../../utils/currency'
import { formatDate, monthLabel } from '../../utils/dates'
import {
  averageCategorySpend,
  budgetUtilization,
  categoryBreakdown,
  emergencyFundStatus,
  goalProgress,
  lastNMonths,
  monthlyEquivalent,
  nextPayment,
  recurringTotals,
  simulateCategoryCut,
  simulateExpenseChange,
  summarizeMonth,
  summarizeMonths,
} from '../../utils/finance'

type Reply = Pick<CoachMessage, 'content' | 'cards' | 'followUps'>

/** First money-looking number in a sentence: "₹10,000", "10k", "3000" (≥ 100) */
export function extractAmount(text: string): number | null {
  const re = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|lakhs)?\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const n = parseFloat(m[1].replace(/,/g, '')) * (m[2]?.toLowerCase() === 'k' ? 1e3 : m[2] ? 1e5 : 1)
    if (n >= 100) return n
  }
  return null
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w))

export function demoCoachReply(question: string, data: FinanceSnapshot, month: MonthKey): Reply {
  const t = question.toLowerCase()
  const detailed = data.settings.coach.responseStyle === 'detailed'
  const showCalc = data.settings.coach.showCalculations
  const summary = summarizeMonth(data.transactions, month)
  const recent = summarizeMonths(data.transactions, lastNMonths(month, 3))
  const ml = monthLabel(month)

  // --- Safety: no specific investment advice ---
  if (has(t, 'stock', 'share price', 'crypto', 'bitcoin', 'which mutual fund', 'which fund', 'best fund', 'guaranteed return', 'should i buy', 'invest in')) {
    return {
      content:
        "I can't recommend specific stocks, funds or other securities, or predict returns - Finora is a budgeting and planning coach, not an investment adviser.\n\nWhat I can do: work out how much you can set aside each month, explain concepts like emergency funds and diversification in general terms, and check that your goals are funded. For investment decisions, please speak to a SEBI-registered investment adviser.",
      followUps: ['How much can I save each month?', 'How much emergency fund should I build?'],
    }
  }

  // --- Where is my money going? ---
  if (has(t, 'where', 'going', 'most', 'biggest', 'breakdown', 'top categor')) {
    const cats = categoryBreakdown(summary).slice(0, 5)
    if (!cats.length) return { content: `I don't see any spending in ${ml} yet. Add or import transactions and ask again.` }
    const top = cats[0]
    return {
      content: `In ${ml} you spent ${inr(summary.expenses)}. The largest share went to ${categoryLabel(top.category)} (${inr(top.amount)}, ${pct(top.share)})${cats[1] ? `, followed by ${categoryLabel(cats[1].category)} (${pct(cats[1].share)})` : ''}.${
        detailed ? `\n\nHousing is usually hard to change quickly, so the categories you can most easily influence are ${cats.filter((c) => c.category !== 'housing').slice(0, 2).map((c) => categoryLabel(c.category)).join(' and ')}.` : ''
      }`,
      cards: [{ title: `Top spending · ${ml}`, rows: cats.map((c) => ({ label: categoryLabel(c.category), value: `${inr(c.amount)} · ${pct(c.share)}` })) }],
      followUps: ['Am I spending too much on dining?', 'How can I save ₹10,000 monthly?'],
    }
  }

  // --- What if I reduce <category> by N%? ---
  const pctMatch = /(\d{1,2})\s*%/.exec(t)
  if (pctMatch && has(t, 'reduce', 'cut', 'lower', 'less', 'decrease')) {
    const cutPct = Math.min(90, parseInt(pctMatch[1], 10))
    const category: CategoryId = has(t, 'shop') ? 'shopping' : has(t, 'entertain', 'movie') ? 'entertainment' : has(t, 'transport', 'travel', 'uber', 'fuel') ? 'transport' : 'food'
    const avg = averageCategorySpend(data.transactions, category, month, 3)
    const sim = simulateCategoryCut(avg, cutPct)
    const goal = data.goals.find((g) => goalProgress(g).remaining > 0)
    const before = goal ? goalProgress(goal) : null
    const after = goal ? goalProgress(goal, sim.monthlySaving) : null
    return {
      content: `Cutting ${categoryLabel(category)} by ${cutPct}% takes your average from ${inr(avg)} to ${inr(sim.newMonthly)} a month - ${inr(sim.monthlySaving)} saved monthly, ${inr(sim.annualSaving)} a year.${
        goal && before && after && after.projectedDate
          ? ` Put toward "${goal.name}", it would finish ${formatDate(after.projectedDate, { month: 'short', year: 'numeric' })} instead of ${before.projectedDate ? formatDate(before.projectedDate, { month: 'short', year: 'numeric' }) : 'never at the current rate'}.`
          : ''
      }`,
      cards: [
        {
          title: `Scenario: ${categoryLabel(category)} −${cutPct}%`,
          rows: [
            { label: 'Current (3-mo avg)', value: inr(avg) },
            { label: 'New monthly', value: inr(sim.newMonthly) },
            { label: 'Monthly saving', value: inr(sim.monthlySaving), tone: 'ok' },
            { label: 'Annual saving', value: inr(sim.annualSaving), tone: 'ok' },
          ],
          footnote: showCalc ? `${inr(avg)} × ${cutPct}% = ${inr(sim.monthlySaving)} per month.` : undefined,
        },
      ],
      followUps: ['How can I save ₹10,000 monthly?', 'What happens if my rent increases by ₹3,000?'],
    }
  }

  // --- What if an expense (rent) increases? ---
  if (has(t, 'rent', 'increase', 'what if', 'what happens', 'goes up', 'hike')) {
    const change = extractAmount(t) ?? 3000
    const isDecrease = has(t, 'decrease', 'reduce', 'drop', 'lower')
    const delta = isDecrease ? -change : change
    const sim = simulateExpenseChange({ income: summary.income, expenses: summary.expenses, change: delta })
    const what = has(t, 'rent') ? 'rent' : 'expenses'
    return {
      content: `If your ${what} ${isDecrease ? 'drops' : 'increases'} by ${inr(change)} a month, your monthly surplus goes from ${inr(sim.disposableBefore)} to ${inr(sim.disposableAfter)} and your savings rate from ${pct(sim.savingsRateBefore, 1)} to ${pct(sim.savingsRateAfter, 1)}.${
        sim.savingsRateAfter < data.profile.preferences.savingsRateTarget && !isDecrease
          ? ` That's below your ${data.profile.preferences.savingsRateTarget}% target, so you'd need to trim about ${inr(Math.max(0, (data.profile.preferences.savingsRateTarget / 100) * summary.income - sim.disposableAfter))} elsewhere to stay on track.`
          : ''
      }`,
      cards: [
        {
          title: `Scenario: ${what} ${isDecrease ? '−' : '+'}${inr(change)}/month`,
          rows: [
            { label: 'Surplus today', value: inr(sim.disposableBefore) },
            { label: 'Surplus after', value: inr(sim.disposableAfter), tone: sim.disposableAfter < sim.disposableBefore ? 'warn' : 'ok' },
            { label: 'Savings rate', value: `${pct(sim.savingsRateBefore, 1)} → ${pct(sim.savingsRateAfter, 1)}` },
            { label: 'Yearly impact', value: inr(Math.abs(sim.annualImpact)), tone: isDecrease ? 'ok' : 'warn' },
          ],
          footnote: showCalc ? `Based on ${ml}: income ${inr(summary.income)} − expenses ${inr(summary.expenses)}.` : undefined,
        },
      ],
      followUps: ['How can I save ₹10,000 monthly?', 'What if I reduce dining by 30%?'],
    }
  }

  // --- Save X per month ---
  if (has(t, 'save', 'saving', 'cut', 'reduce')) {
    const goal = extractAmount(t) ?? 10000
    const current = summary.savings
    const needed = Math.max(0, goal - Math.max(0, current - (data.goals.reduce((s, g) => s + g.monthlyContribution, 0))))
    // Candidate cuts from discretionary categories, biggest first
    const cuts: { category: CategoryId; avg: number; cutPct: number }[] = (['food', 'shopping', 'entertainment', 'transport', 'other'] as CategoryId[])
      .map((c) => ({ category: c, avg: averageCategorySpend(data.transactions, c, month, 3), cutPct: c === 'food' ? 30 : c === 'shopping' ? 40 : c === 'entertainment' ? 40 : 15 }))
      .filter((c) => c.avg > 0)
      .sort((a, b) => b.avg * b.cutPct - a.avg * a.cutPct)
    const plan: { label: string; saving: number }[] = []
    let total = 0
    for (const c of cuts) {
      if (total >= goal) break
      const s = Math.round(simulateCategoryCut(c.avg, c.cutPct).monthlySaving / 50) * 50
      plan.push({ label: `${categoryLabel(c.category)}: cut ${c.cutPct}% of ${inr(c.avg)} avg`, saving: s })
      total += s
    }
    const unusedSubs = data.subscriptions.filter((s) => s.status === 'active' && s.usage === 'rarely')
    for (const s of unusedSubs) {
      plan.push({ label: `Cancel ${s.name} (marked rarely used)`, saving: Math.round(monthlyEquivalent(s)) })
      total += monthlyEquivalent(s)
    }
    return {
      content: `You already save about ${inr(current)} a month (${pct(summary.savingsRate, 1)} of income in ${ml}). To free up an extra ${inr(goal)}/month for new goals, here's a plan using your 3-month averages${total >= goal ? ' that gets you there' : ` that reaches about ${inr(total)} - the rest would need an income change or a bigger cut`}:${
        detailed ? '\n\nThese are suggestions to discuss with yourself, not rules - pick the cuts that feel sustainable.' : ''
      }`,
      cards: [
        {
          title: `Plan to free up ${inr(goal)}/month`,
          rows: [...plan.map((p) => ({ label: p.label, value: `+${inr(p.saving)}`, tone: 'ok' as const })), { label: 'Total', value: `${inr(total)}/month`, tone: total >= goal ? 'ok' : 'warn' }],
          footnote: showCalc ? `Needed beyond current goal contributions: ${inr(needed)}. Averages use ${lastNMonths(month, 3).map((m) => monthLabel(m, 'short')).join(', ')}.` : undefined,
        },
      ],
      followUps: ['Am I spending too much on dining?', 'Show my goal progress'],
    }
  }

  // --- Dining ---
  if (has(t, 'dining', 'food', 'eat', 'restaurant', 'swiggy', 'zomato', 'order')) {
    const spent = summary.byCategory.food ?? 0
    const budget = data.profile.variableBudgets.food ?? 0
    const avg = averageCategorySpend(data.transactions, 'food', month, 3)
    const share = summary.income ? (spent / summary.income) * 100 : 0
    const deliveries = data.transactions.filter((x) => x.date.startsWith(month) && x.category === 'food' && /swiggy|zomato/i.test(x.merchant))
    const over = budget > 0 && spent > budget
    return {
      content: `${over ? 'Yes, a little.' : 'Not really.'} You spent ${inr(spent)} on Food & Dining in ${ml}${budget ? ` against a ${inr(budget)} budget (${pct((spent / budget) * 100)} used)` : ''}. That's ${pct(share, 1)} of your income, and your 3-month average is ${inr(avg)}.${
        deliveries.length ? ` ${deliveries.length} of those were food-delivery orders totalling ${inr(deliveries.reduce((s, d) => s + d.amount, 0))}.` : ''
      }${over ? ` Cutting dining by 30% would save about ${inr(simulateCategoryCut(spent, 30).monthlySaving)} a month.` : ''}`,
      cards: [
        {
          title: 'Food & Dining check',
          rows: [
            { label: `${ml} spend`, value: inr(spent), tone: over ? 'warn' : 'ok' },
            { label: 'Budget', value: budget ? inr(budget) : 'Not set' },
            { label: '3-month average', value: inr(avg) },
            { label: 'Share of income', value: pct(share, 1) },
          ],
        },
      ],
      followUps: ['What if I reduce dining by 30%?', 'Where is most of my money going?'],
    }
  }

  // --- Emergency fund ---
  if (has(t, 'emergency', 'rainy day', 'safety net')) {
    const ef = emergencyFundStatus(data.profile, recent)
    const months = data.profile.preferences.emergencyFundMonths
    return {
      content: `A common guideline is 3-6 months of essential expenses; you've set a target of ${months} months. Your essential spending (housing, food, bills, transport, healthcare) averages ${inr(ef.monthlyEssential)} a month, so your target is about ${inr(ef.target)}. You have ${inr(data.profile.emergencyFund)} - ${ef.monthsCovered.toFixed(1)} months of cover.${
        ef.shortfall > 0 ? ` Saving ${inr(ef.shortfall / 8)} a month would close the ${inr(ef.shortfall)} gap in about 8 months.` : ' You have fully funded it - well done.'
      }${detailed ? '\n\nKeep it somewhere safe and easy to access, separate from day-to-day spending money.' : ''}`,
      cards: [
        {
          title: 'Emergency fund',
          rows: [
            { label: 'Current', value: inr(data.profile.emergencyFund) },
            { label: `Target (${months} months)`, value: inr(ef.target) },
            { label: 'Months covered', value: ef.monthsCovered.toFixed(1), tone: ef.monthsCovered >= months ? 'ok' : 'warn' },
            { label: 'Gap', value: inr(ef.shortfall), tone: ef.shortfall > 0 ? 'warn' : 'ok' },
          ],
        },
      ],
      followUps: ['How can I save ₹10,000 monthly?', 'Show my goal progress'],
    }
  }

  // --- Subscriptions ---
  if (has(t, 'subscription', 'recurring', 'netflix', 'spotify', 'renew')) {
    const totals = recurringTotals(data.subscriptions)
    const active = data.subscriptions.filter((s) => s.status === 'active')
    return {
      content: `You have ${totals.activeCount} active recurring payments costing ${inr(totals.monthly)} a month (about ${inr(totals.yearly)} a year).${
        active.some((s) => s.previousAmount && s.amount > s.previousAmount) ? ' Some prices went up recently - see Subscriptions for details.' : ''
      }`,
      cards: [{ title: 'Recurring payments', rows: active.map((s) => ({ label: s.name, value: `${inr(s.amount)} · next ${formatDate(nextPayment(s))}` })) }],
      followUps: ['How can I save ₹10,000 monthly?'],
    }
  }

  // --- Goals ---
  if (has(t, 'goal', 'target', 'laptop', 'vacation', 'trip')) {
    if (!data.goals.length) return { content: "You haven't set any goals yet. Create one in the Goal Planner and I'll track it." }
    return {
      content: `You have ${data.goals.length} goals. ${data.goals.filter((g) => goalProgress(g).onTrack).length} are on track at your current contributions.`,
      cards: [
        {
          title: 'Goal progress',
          rows: data.goals.map((g) => {
            const p = goalProgress(g)
            return { label: g.name, value: `${pct(p.progress)} · ${p.onTrack ? 'on track' : `needs ${inr(p.requiredMonthly)}/mo`}`, tone: p.onTrack ? 'ok' : 'warn' }
          }),
        },
      ],
      followUps: ['How can I save ₹10,000 monthly?'],
    }
  }

  // --- Budget ---
  if (has(t, 'budget', 'overspend', 'over budget')) {
    const b = budgetUtilization(summary, data.profile)
    const over = b.rows.filter((r) => r.budget > 0 && r.spent > r.budget)
    return {
      content: `You've used ${pct(b.utilization)} of your ${inr(b.budget)} monthly budget in ${ml}. ${over.length ? `${over.map((r) => categoryLabel(r.category)).join(', ')} went over.` : 'No category went over.'}`,
      cards: [{ title: 'Budget use', rows: b.rows.slice(0, 6).map((r) => ({ label: categoryLabel(r.category), value: `${inr(r.spent)} / ${inr(r.budget)}`, tone: r.spent > r.budget ? 'warn' : 'ok' })) }],
    }
  }

  // --- Fallback: overview + what I can do ---
  return {
    content: `Here's a quick snapshot of ${ml}: income ${inr(summary.income)}, spending ${inr(summary.expenses)}, savings ${inr(summary.savings)} (${pct(summary.savingsRate, 1)}).\n\nIn demo mode I can answer questions about where your money goes, saving a monthly amount, "what if" cost changes, dining spend, your emergency fund, subscriptions, budgets and goals.`,
    followUps: ['Where is most of my money going?', 'How can I save ₹10,000 monthly?', 'What happens if my rent increases by ₹3,000?'],
  }
}

