import { useEffect, useRef, useState } from 'react'

/** Measure an element's width (charts render to the real pixel width). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/** "Nice" axis ticks from 0 to ≥ max, e.g. 0, 20K, 40K, 60K, 80K */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)
  return ticks
}

export interface TooltipRow {
  label: string
  value: string
  color?: string
  dashed?: boolean
}

/** Positioned tooltip; flips to the left of the cursor near the right edge. */
export function ChartTooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: TooltipRow[] }) {
  const flip = x > width - 180
  return (
    <div
      className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-line-strong bg-panel-2/95 px-3 py-2 text-xs shadow-xl shadow-black/40 backdrop-blur"
      style={flip ? { right: width - x + 12 } : { left: x + 12 }}
      role="status"
    >
      <div className="mb-1 font-medium text-fg">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            {r.color && <SeriesKey color={r.color} dashed={r.dashed} />}
            {r.label}
          </span>
          <span className="num font-medium text-fg">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SeriesKey({ color, dashed, shape = 'line' }: { color: string; dashed?: boolean; shape?: 'line' | 'square' }) {
  if (shape === 'square') return <span className="inline-block size-2.5 rounded-[3px]" style={{ background: color }} />
  return (
    <svg width="14" height="6" aria-hidden="true">
      <line x1="1" x2="13" y1="3" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashed ? '3 3' : undefined} />
    </svg>
  )
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean; shape?: 'line' | 'square' }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <SeriesKey color={i.color} dashed={i.dashed} shape={i.shape} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
