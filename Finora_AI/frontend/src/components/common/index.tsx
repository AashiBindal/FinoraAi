// Reusable Finora building blocks (on top of components/ui primitives).

import { useEffect, type ReactNode } from 'react'
import { CATEGORY_MAP } from '../../data/categories'
import type { CategoryId } from '../../types/finance'
import { Badge, Card, Icon, IconButton, cx, type IconName } from '../ui'

/* ---------- KPI card ---------- */
export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaGood,
  hint,
  children,
  accent = false,
}: {
  label: string
  value: ReactNode
  icon: IconName
  /** % change vs previous period */
  delta?: number | null
  /** Is an increase good (income) or bad (expenses)? */
  deltaGood?: 'up' | 'down'
  hint?: ReactNode
  children?: ReactNode
  accent?: boolean
}) {
  const showDelta = delta != null && Number.isFinite(delta)
  const good = showDelta && ((deltaGood === 'up' && delta! >= 0) || (deltaGood === 'down' && delta! <= 0))
  return (
    <Card className={cx('flex flex-col gap-3 transition-colors hover:border-line-strong', accent && 'border-accent/25')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className={cx('grid size-8 place-items-center rounded-lg', accent ? 'bg-accent-soft text-accent' : 'bg-hover text-muted')}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="num text-[26px] leading-none font-semibold tracking-tight">{value}</div>
      <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs">
        {showDelta && (
          <span className={cx('inline-flex items-center gap-0.5 font-medium', good ? 'text-ok' : 'text-danger')}>
            <Icon name={delta! >= 0 ? 'trendingUp' : 'trendingDown'} size={13} />
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-faint">{hint}</span>}
      </div>
      {children}
    </Card>
  )
}

/* ---------- Category visuals ---------- */
export function CategoryIcon({ category, size = 'md' }: { category: CategoryId; size?: 'sm' | 'md' }) {
  const c = CATEGORY_MAP[category] ?? CATEGORY_MAP.other
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-lg', size === 'sm' ? 'size-7' : 'size-9')}
      style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}
      title={c.label}
    >
      <Icon name={c.icon} size={size === 'sm' ? 13 : 16} />
    </span>
  )
}

export function CategoryBadge({ category }: { category: CategoryId }) {
  const c = CATEGORY_MAP[category] ?? CATEGORY_MAP.other
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line bg-panel-2 px-2 text-xs whitespace-nowrap text-fg/90">
      <span className="size-2 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

/* ---------- Sample-data labelling ---------- */
export function SampleBadge({ label = 'Sample data' }: { label?: string }) {
  return (
    <Badge tone="warn" className="uppercase tracking-wide">
      {label}
    </Badge>
  )
}

export function DemoNotice({ children, icon = 'info' }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn-soft/60 px-3.5 py-2.5 text-xs leading-relaxed text-fg/85">
      <Icon name={icon} size={14} className="mt-0.5 text-warn" />
      <div>{children}</div>
    </div>
  )
}

export function Disclaimer({ compact }: { compact?: boolean }) {
  return (
    <p className={cx('flex items-start gap-2 text-faint', compact ? 'text-[11px]' : 'text-xs leading-relaxed')}>
      <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
      <span>
        Finora AI provides financial education and budgeting tools, not investment, tax or legal advice. It does not recommend securities, promise returns or move money.
        {!compact && ' Consult a SEBI-registered adviser for investment decisions.'}
      </span>
    </p>
  )
}

/* ---------- Section header used inside cards ---------- */
export function SectionTitle({ title, subtitle, action, icon }: { title: string; subtitle?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <Icon name={icon} size={16} className="mt-0.5 text-faint" />}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ value, onChange, options, size = 'sm' }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-panel-2 p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-hover font-medium text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Toggle switch ---------- */
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line-strong')}
      >
        <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

/* ---------- Right-side drawer ---------- */
export function Drawer({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="fade-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line-strong bg-panel shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </aside>
    </div>
  )
}

/* ---------- Key/value list ---------- */
export function KeyValue({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="num text-right text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ---------- Skeleton ---------- */
export const Skeleton = ({ className }: { className?: string }) => <div className={cx('animate-pulse rounded-lg bg-hover/70', className)} />

/* ---------- Inline form error ---------- */
export const FieldError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-[11px] text-danger">{message}</p> : null)
