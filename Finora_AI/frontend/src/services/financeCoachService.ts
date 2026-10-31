// AI Finance Coach service.
//
//   COACH_MODE=api: POST /api/ai/chat { message } on the Spring backend. The backend
//     builds the financial context from the user's stored data and holds the model
//     key - never the browser. If the backend reports that AI is disabled/unreachable,
//     the reply says so and the clearly-labelled demo answer is shown instead.
//   COACH_MODE=demo: replies come from services/coach/demoCoach.ts - rule-based
//     calculations over your data, labelled "Demo" in the UI.

import type { CoachMessage, FinanceSnapshot, MonthKey } from '../types/finance'
import { inr } from '../utils/currency'
import { monthLabel } from '../utils/dates'
import { categoryBreakdown, profileFixed, profileIncome, summarizeMonth } from '../utils/finance'
import { demoCoachReply } from './coach/demoCoach'
import { COACH_MODE } from './config'
import { http } from './http'
import { delay, newId, storage } from './storage'

const HISTORY_KEY = 'coachHistory'

/** Compact, non-identifying context sent with each question in API mode. */
export function buildCoachContext(data: FinanceSnapshot, month: MonthKey) {
  const s = summarizeMonth(data.transactions, month)
  return [
    `Month: ${monthLabel(month)}`,
    `Income: ${inr(s.income)} (profile ${inr(profileIncome(data.profile))})`,
    `Expenses: ${inr(s.expenses)}; fixed costs ${inr(profileFixed(data.profile))}`,
    `Savings rate: ${s.savingsRate.toFixed(1)}% (target ${data.profile.preferences.savingsRateTarget}%)`,
    `Top categories: ${categoryBreakdown(s).slice(0, 4).map((c) => `${c.category} ${inr(c.amount)}`).join(', ')}`,
    `Emergency fund: ${inr(data.profile.emergencyFund)}`,
    `Goals: ${data.goals.map((g) => `${g.name} ${inr(g.savedAmount)}/${inr(g.targetAmount)} by ${g.targetDate}`).join('; ')}`,
  ].join('\n')
}

/** Messages AIServiceImpl returns instead of a model answer. */
const BACKEND_AI_UNAVAILABLE = ['AI Finance Coach is currently disabled', 'I am currently unable to connect to the AI service']

/** Safety preamble for any future prompt sent from the client (the Spring backend uses its own system prompt). */
export const SAFETY_PREAMBLE =
  'You are Finora, a personal-finance education and budgeting coach for an Indian user. Use INR. ' +
  'Never recommend specific securities, promise returns or claim to execute transactions. Be concise.'

export const financeCoachService = {
  mode: COACH_MODE,

  async loadHistory(): Promise<CoachMessage[]> {
    return delay(storage.get<CoachMessage[]>(HISTORY_KEY, []), 0)
  },
  saveHistory(messages: CoachMessage[]) {
    storage.set(HISTORY_KEY, messages.slice(-60))
  },
  clearHistory() {
    storage.remove(HISTORY_KEY)
  },

  async ask(question: string, data: FinanceSnapshot, month: MonthKey): Promise<CoachMessage> {
    const base = { id: newId('msg'), role: 'assistant' as const, createdAt: new Date().toISOString() }
    if (COACH_MODE === 'api') {
      const res = await http<{ response: string; model?: string }>('/api/ai/chat', { method: 'POST', body: { message: question.trim().slice(0, 1000) } })
      const text = (res.response ?? '').trim()
      if (!text || BACKEND_AI_UNAVAILABLE.some((p) => text.startsWith(p))) {
        // Honest fallback: say the model is not available, then show the labelled rule-based answer.
        const reply = demoCoachReply(question, data, month)
        return {
          ...base,
          ...reply,
          source: 'demo',
          content: `The AI coach on the server is not available (${text || 'empty response'}). Below is the rule-based demo answer computed from your data.\n\n${reply.content}`,
        }
      }
      return { ...base, source: 'ai', content: text }
    }
    // Demo mode: a short pause so the typing indicator is visible
    const reply = demoCoachReply(question, data, month)
    return delay({ ...base, ...reply, source: 'demo' }, 650)
  },
}
