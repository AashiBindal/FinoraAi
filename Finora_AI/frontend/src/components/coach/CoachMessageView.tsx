import type { CoachInsightCard, CoachMessage } from '../../types/finance'
import { Badge, Icon, cx } from '../ui'

const TONE = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger', neutral: 'text-fg' }

function InsightCard({ card }: { card: CoachInsightCard }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line bg-panel-2/60 px-3.5 py-2 text-xs font-medium text-fg">
        <Icon name="pieChart" size={13} className="text-violet" />
        {card.title}
      </div>
      <dl className="divide-y divide-line">
        {card.rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-3.5 py-2 text-[13px]">
            <dt className="text-muted">{r.label}</dt>
            <dd className={cx('num text-right font-medium', TONE[r.tone ?? 'neutral'])}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {card.footnote && <p className="border-t border-line px-3.5 py-2 text-[11px] text-faint">{card.footnote}</p>}
    </div>
  )
}

export function CoachAvatar() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-violet/30 bg-violet-soft text-violet">
      <Icon name="sparkles" size={15} />
    </span>
  )
}

export function CoachMessageView({ message, onFollowUp }: { message: CoachMessage; onFollowUp: (q: string) => void }) {
  if (message.role === 'user') {
    return (
      <div className="fade-in flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent-soft px-4 py-2.5 text-sm whitespace-pre-wrap text-fg sm:max-w-[70%]">{message.content}</div>
      </div>
    )
  }
  return (
    <div className="fade-in flex gap-3">
      <CoachAvatar />
      <div className="min-w-0 max-w-[90%] space-y-3 sm:max-w-[80%]">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-fg">Finora Coach</span>
          {message.source === 'demo' && (
            <Badge tone="warn" className="h-[18px]" >
              Demo response · rule-based
            </Badge>
          )}
          {message.source === 'ai' && <Badge tone="violet">AI</Badge>}
        </div>
        <div className={cx('rounded-2xl rounded-tl-md border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap', message.error ? 'border-danger/30 bg-danger-soft/30 text-fg' : 'border-line bg-panel-2 text-fg/95')}>
          {message.content}
        </div>
        {message.cards?.map((c, i) => <InsightCard key={i} card={c} />)}
        {message.followUps && message.followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.followUps.map((f) => (
              <button key={f} onClick={() => onFollowUp(f)} className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted transition-colors hover:border-violet/40 hover:text-fg">
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <CoachAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-panel-2 px-4 py-3">
        <span className="thinking-dot size-1.5 rounded-full bg-violet" />
        <span className="thinking-dot size-1.5 rounded-full bg-violet" />
        <span className="thinking-dot size-1.5 rounded-full bg-violet" />
        <span className="ml-2 text-xs text-faint">Analysing your finances…</span>
      </div>
    </div>
  )
}
