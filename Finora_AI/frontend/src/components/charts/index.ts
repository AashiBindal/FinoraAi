// Dependency-free SVG charts (no Recharts needed). Colours come from the
// validated series tokens in index.css.
export { BarChart, type BarDatum, type BarSeries } from './BarChart'
export { ChartLegend, SeriesKey } from './chartUtils'
export { DonutChart, type DonutSegment } from './DonutChart'
export { LineChart, type LineDatum, type LineSeries } from './LineChart'

export const SERIES = {
  income: 'var(--color-series-1)',
  expenses: 'var(--color-series-2)',
  savings: 'var(--color-series-3)',
  previous: 'var(--color-series-other)',
}
