import { useState, type MouseEvent } from 'react'
import { ChartTooltip, niceTicks, useElementWidth } from './chartUtils'

export interface LineSeries {
  key: string
  name: string
  color: string
  dashed?: boolean
  /** Soft area fill under the line */
  area?: boolean
}
export interface LineDatum {
  label: string
  title?: string
  values: Record<string, number | null>
}

const M = { top: 10, right: 8, bottom: 24, left: 48 }

/** Line / area chart with a crosshair tooltip. 2px lines, one y-axis. */
export function LineChart({
  data,
  series,
  height = 220,
  format,
  axisFormat = format,
  ariaLabel,
  labelEvery = 1,
  minZero = true,
}: {
  data: LineDatum[]
  series: LineSeries[]
  height?: number
  format: (n: number) => string
  axisFormat?: (n: number) => string
  ariaLabel: string
  /** Show every Nth x label (for dense daily data) */
  labelEvery?: number
  minZero?: boolean
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const all = data.flatMap((d) => series.map((s) => d.values[s.key])).filter((v): v is number => v != null)
  const max = Math.max(0, ...all)
  const min = minZero ? 0 : Math.min(0, ...all)
  const ticks = niceTicks(max - min).map((t) => t + min)
  const top = ticks[ticks.length - 1] || 1
  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = height - M.top - M.bottom
  const x = (i: number) => M.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v: number) => M.top + innerH - ((v - min) / (top - min || 1)) * innerH

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round((px / (rect.width || 1)) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  const pathFor = (key: string) => {
    let d = ''
    let open = false
    data.forEach((p, i) => {
      const v = p.values[key]
      if (v == null) {
        open = false
        return
      }
      d += `${open ? 'L' : 'M'}${x(i)},${y(v)} `
      open = true
    })
    return d
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            {series.filter((s) => s.area).map((s) => (
              <linearGradient key={s.key} id={`area-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : '2 4'} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px]">
                {axisFormat?.(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text key={d.label} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-muted text-[11px]">
                {d.label}
              </text>
            ) : null,
          )}
          {series.map((s) => {
            const line = pathFor(s.key)
            const firstIdx = data.findIndex((p) => p.values[s.key] != null)
            let lastIdx = -1
            data.forEach((p, i) => p.values[s.key] != null && (lastIdx = i))
            return (
              <g key={s.key}>
                {s.area && firstIdx >= 0 && <path d={`${line} L${x(lastIdx)},${y(min)} L${x(firstIdx)},${y(min)} Z`} fill={`url(#area-${s.key})`} />}
                <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
              </g>
            )
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} stroke="var(--color-line-strong)" />
              {series.map((s) => {
                const v = data[hover].values[s.key]
                return v == null ? null : <circle key={s.key} cx={x(hover)} cy={y(v)} r={4} fill={s.color} stroke="var(--color-panel)" strokeWidth={2} />
              })}
            </g>
          )}
          <rect x={M.left} y={0} width={innerW} height={height} fill="transparent" onMouseMove={onMove} />
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip
          x={x(hover)}
          width={width}
          title={data[hover].title ?? data[hover].label}
          rows={series
            .filter((s) => data[hover].values[s.key] != null)
            .map((s) => ({ label: s.name, value: format(data[hover].values[s.key] as number), color: s.color, dashed: s.dashed }))}
        />
      )}
    </div>
  )
}
