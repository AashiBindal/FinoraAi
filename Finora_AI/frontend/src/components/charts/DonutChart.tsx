import { useState, type ReactNode } from 'react'

export interface DonutSegment {
  key: string
  label: string
  value: number
  color: string
}

/** Donut with 2px surface gaps between segments; hover highlights a segment. */
export function DonutChart({
  segments,
  size = 180,
  thickness = 22,
  center,
  format,
  ariaLabel,
  activeKey,
  onActiveChange,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  center?: ReactNode
  format: (n: number) => string
  ariaLabel: string
  activeKey?: string | null
  onActiveChange?: (key: string | null) => void
}) {
  const [hoverLocal, setHoverLocal] = useState<string | null>(null)
  const active = activeKey !== undefined ? activeKey : hoverLocal
  const setActive = onActiveChange ?? setHoverLocal
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - 4
  const inner = r - thickness
  const cx = size / 2
  let angle = -Math.PI / 2

  const arc = (start: number, end: number, ro: number, ri: number) => {
    const large = end - start > Math.PI ? 1 : 0
    const p = (a: number, rad: number) => `${cx + rad * Math.cos(a)},${cx + rad * Math.sin(a)}`
    return `M${p(start, ro)} A${ro},${ro} 0 ${large} 1 ${p(end, ro)} L${p(end, ri)} A${ri},${ri} 0 ${large} 0 ${p(start, ri)} Z`
  }
  const hovered = segments.find((s) => s.key === active)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} onMouseLeave={() => setActive(null)}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel}>
        {total <= 0 ? (
          <circle cx={cx} cy={cx} r={r - thickness / 2} fill="none" stroke="var(--color-hover)" strokeWidth={thickness} />
        ) : (
          segments.map((s) => {
            const sweep = (s.value / total) * Math.PI * 2
            const start = angle
            const end = angle + Math.min(sweep, Math.PI * 2 - 0.0001)
            angle += sweep
            const isActive = active === s.key
            return (
              <path
                key={s.key}
                d={arc(start, end, isActive ? r + 3 : r, inner)}
                fill={s.color}
                stroke="var(--color-panel)"
                strokeWidth={2}
                opacity={active && !isActive ? 0.45 : 1}
                onMouseEnter={() => setActive(s.key)}
                className="cursor-default transition-opacity"
              >
                <title>{`${s.label}: ${format(s.value)}`}</title>
              </path>
            )
          })
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hovered ? (
          <>
            <div className="max-w-[60%] truncate text-[11px] text-muted">{hovered.label}</div>
            <div className="num text-base font-semibold">{format(hovered.value)}</div>
            <div className="num text-[11px] text-faint">{total ? ((hovered.value / total) * 100).toFixed(1) : 0}%</div>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  )
}
