import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CoachAvatar, CoachMessageView, TypingIndicator } from '../components/coach/CoachMessageView'
import { DemoNotice, Disclaimer, SectionTitle } from '../components/common'
import { Button, Card, Icon, ProgressBar } from '../components/ui'
import { categoryLabel } from '../data/categories'
import { useFinanceData } from '../hooks/useFinance'
import { COACH_MODE, financeCoachService } from '../services'
import { newId } from '../services/storage'
import type { CoachMessage } from '../types/finance'
import { inr, inrCompact, pct } from '../utils/currency'
import { formatDate, monthLabel } from '../utils/dates'
import { categoryBreakdown, nextPayment, profileFixed, profileIncome, summarizeMonth } from '../utils/finance'

const SUGGESTED = [
  'Where is most of my money going?',
  'How can I save ₹10,000 monthly?',
  'What happens if my rent increases by ₹3,000?',
  'Am I spending too much on dining?',
  'How much emergency fund should I build?',
]

export default function FinanceCoach() {
  const { data, month } = useFinanceData()
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void financeCoachService.loadHistory().then(setMessages)
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, pending])

  async function ask(text = input) {
    const q = text.trim()
    if (!q || pending) return
    setInput('')
    const userMsg: CoachMessage = { id: newId('msg'), role: 'user', content: q, createdAt: new Date().toISOString() }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    setPending(true)
    let reply: CoachMessage
    try {
      reply = await financeCoachService.ask(q, data, month)
    } catch (e) {
      reply = { id: newId('msg'), role: 'assistant', createdAt: new Date().toISOString(), error: true, content: e instanceof Error ? e.message : 'The coach could not answer right now.' }
    }
    const next = [...withUser, reply]
    setMessages(next)
    financeCoachService.saveHistory(next)
    setPending(false)
  }

  const clear = () => {
    financeCoachService.clearHistory()
    setMessages([])
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask()
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card padded={false} className="flex h-[calc(100vh-8.5rem)] min-h-[560px] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-3">
            <CoachAvatar />
            <div>
              <div className="text-sm font-semibold">Finora Coach</div>
              <div className="flex items-center gap-1.5 text-[11px] text-faint">
                <span className={COACH_MODE === 'api' ? 'size-1.5 rounded-full bg-ok' : 'size-1.5 rounded-full bg-warn'} />
                {COACH_MODE === 'api' ? 'Server coach · falls back to labelled demo answers if AI is off' : 'Demo mode · no AI model connected'}
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon="trash" onClick={clear} disabled={!messages.length}>
            Clear chat
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          {COACH_MODE === 'demo' && (
            <DemoNotice icon="sparkles">
              <b className="font-medium text-fg">Demo coach.</b> Replies are rule-based calculations on your data in this browser - no AI model is connected yet. The service layer is ready for a real model (set <code className="font-mono">VITE_FINORA_COACH_MODE=api</code>).
            </DemoNotice>
          )}

          {messages.length === 0 && !pending && (
            <div className="flex flex-col items-center px-4 pt-6 text-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-violet/30 bg-violet-soft text-violet">
                <Icon name="sparkles" size={24} />
              </span>
              <h2 className="mt-4 text-lg font-semibold">What would you like to understand about your money?</h2>
              <p className="mt-1 max-w-md text-sm text-muted">I look at your transactions, budgets and goals for {monthLabel(month)} and explain what's happening - with the numbers.</p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="group flex items-center gap-2.5 rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-left text-sm text-fg/90 transition-colors hover:border-violet/40 hover:bg-hover"
                  >
                    <Icon name="message" size={15} className="shrink-0 text-faint group-hover:text-violet" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <CoachMessageView key={m.id} message={m} onFollowUp={(q) => ask(q)} />
          ))}
          {pending && <TypingIndicator />}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line p-3 sm:p-4">
          {messages.length > 0 && (
            <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={pending} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-line bg-panel-2 p-2 focus-within:border-line-strong focus-within:ring-2 focus-within:ring-accent/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              maxLength={1000}
              aria-label="Ask the finance coach"
              placeholder="Ask about your spending, savings or goals…"
              className="max-h-36 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm placeholder:text-faint focus:outline-none"
            />
            <Button variant="primary" icon="send" onClick={() => ask()} loading={pending} disabled={!input.trim()}>
              Ask
            </Button>
          </div>
          <div className="mt-2">
            <Disclaimer compact />
          </div>
        </div>
      </Card>

      <ContextPanel />
    </div>
  )
}

/** What the coach "knows" - the same numbers the demo engine calculates from. */
function ContextPanel() {
  const { data, month } = useFinanceData()
  const ctx = useMemo(() => {
    const s = summarizeMonth(data.transactions, month)
    return {
      s,
      income: profileIncome(data.profile),
      fixed: profileFixed(data.profile),
      top: categoryBreakdown(s).slice(0, 4),
      upcoming: data.subscriptions
        .map((sub) => ({ sub, next: nextPayment(sub) }))
        .filter((x): x is { sub: typeof x.sub; next: string } => !!x.next)
        .sort((a, b) => a.next.localeCompare(b.next))
        .slice(0, 4),
    }
  }, [data, month])

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Financial context" subtitle={`What the coach uses · ${monthLabel(month)}`} icon="wallet" />
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['Monthly income', inr(ctx.income)],
            ['Fixed expenses', inr(ctx.fixed)],
            ['Spent this month', inr(ctx.s.expenses)],
            ['Savings rate', pct(ctx.s.savingsRate, 1)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
              <dt className="text-[11px] text-faint">{k}</dt>
              <dd className="num mt-0.5 text-sm font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <SectionTitle title="Spending patterns" icon="pieChart" />
        <ul className="space-y-2.5">
          {ctx.top.map((c) => (
            <li key={c.category}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-fg/90">{categoryLabel(c.category)}</span>
                <span className="num text-faint">{inr(c.amount)}</span>
              </div>
              <ProgressBar value={c.share} tone="violet" className="h-1" />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title="Savings goals" icon="target" />
        <ul className="space-y-2.5 text-sm">
          {data.goals.length === 0 && <li className="text-muted">No goals yet.</li>}
          {data.goals.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-fg/90">{g.name}</span>
              <span className="num shrink-0 text-xs text-faint">
                {inrCompact(g.savedAmount)}/{inrCompact(g.targetAmount)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title="Upcoming payments" icon="calendar" />
        <ul className="space-y-2 text-sm">
          {ctx.upcoming.map(({ sub, next }) => (
            <li key={sub.id} className="flex justify-between gap-3">
              <span className="truncate text-fg/90">{sub.name}</span>
              <span className="num shrink-0 text-xs text-faint">
                {inr(sub.amount)} · {formatDate(next)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
