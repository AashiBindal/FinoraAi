import { useState } from 'react'
import { ChartTooltip, niceTicks, useElementWidth } from './chartUtils'

export interface BarSeries {
  key: string
  name: string
  color: string
}
export interface BarDatum {
  label: string
  /** Optional longer label for the tooltip title */
  title?: string
  values: Record<string, number>
}

const M = { top: 8, right: 4, bottom: 24, left: 48 }

/** Vertical grouped bar chart. Bars: 4px rounded tops, 2px gap inside a group. */
export function BarChart({
  data,
  series,
  height = 240,
  format,
  axisFormat = format,
  ariaLabel,
}: {
  data: BarDatum[]
  series: BarSeries[]
  height?: number
  format: (n: number) => string
  axisFormat?: (n: number) => string
  ariaLabel: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1
  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = height - M.top - M.bottom
  const band = data.length ? innerW / data.length : 0
  const groupW = Math.min(band * 0.62, series.length * 28)
  const gap = 2
  const barW = Math.max(2, (groupW - gap * (series.length - 1)) / series.length)
  const y = (v: number) => M.top + innerH - (v / top) * innerH

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : '2 4'} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px]">
                {axisFormat?.(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const gx = M.left + band * i + (band - groupW) / 2
            return (
              <g key={d.label}>
                {hover === i && <rect x={M.left + band * i} y={M.top} width={band} height={innerH} fill="var(--color-hover)" opacity={0.5} rx={4} />}
                {series.map((s, si) => {
                  const v = d.values[s.key] ?? 0
                  const h = Math.max(0, y(0) - y(v))
                  const x = gx + si * (barW + gap)
                  const r = Math.min(4, barW / 2, h)
                  return h > 0 ? (
                    <path
                      key={s.key}
                      d={`M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + barW - r} Q${x + barW},${y(v)} ${x + barW},${y(v) + r} V${y(0)} Z`}
                      fill={s.color}
                      opacity={hover === null || hover === i ? 1 : 0.55}
                    />
                  ) : null
                })}
                <text x={M.left + band * i + band / 2} y={height - 6} textAnchor="middle" className="fill-muted text-[11px]">
                  {d.label}
                </text>
                <rect x={M.left + band * i} y={0} width={band} height={height} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip
          x={M.left + band * hover + band / 2}
          width={width}
          title={data[hover].title ?? data[hover].label}
          rows={series.map((s) => ({ label: s.name, value: format(data[hover].values[s.key] ?? 0), color: s.color }))}
        />
      )}
    </div>
  )
}
