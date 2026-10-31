import type { IconName } from '../components/ui'
import type { CategoryId } from '../types/finance'

export interface CategoryMeta {
  id: CategoryId
  label: string
  icon: IconName
  /** Chart colour. Assigned in the validated series order - never cycled. */
  color: string
  kind: 'expense' | 'income' | 'both'
  /** Essential spend counts toward the emergency-fund requirement */
  essential?: boolean
}

// Order = validated categorical order (see index.css --color-series-*).
export const CATEGORIES: CategoryMeta[] = [
  { id: 'housing', label: 'Housing', icon: 'home', color: 'var(--color-series-1)', kind: 'expense', essential: true },
  { id: 'food', label: 'Food & Dining', icon: 'utensils', color: 'var(--color-series-2)', kind: 'expense', essential: true },
  { id: 'bills', label: 'Bills & Utilities', icon: 'zap', color: 'var(--color-series-3)', kind: 'expense', essential: true },
  { id: 'shopping', label: 'Shopping', icon: 'bag', color: 'var(--color-series-4)', kind: 'expense' },
  { id: 'transport', label: 'Transportation', icon: 'car', color: 'var(--color-series-5)', kind: 'expense', essential: true },
  { id: 'healthcare', label: 'Healthcare', icon: 'heart', color: 'var(--color-series-6)', kind: 'expense', essential: true },
  { id: 'entertainment', label: 'Entertainment', icon: 'film', color: 'var(--color-series-7)', kind: 'expense' },
  { id: 'education', label: 'Education', icon: 'book', color: 'var(--color-series-8)', kind: 'expense' },
  { id: 'salary', label: 'Salary', icon: 'briefcase', color: 'var(--color-series-1)', kind: 'income' },
  { id: 'investments', label: 'Investments', icon: 'lineChart', color: 'var(--color-series-7)', kind: 'both' },
  { id: 'other', label: 'Other', icon: 'more', color: 'var(--color-series-other)', kind: 'both' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>

export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.kind !== 'income')
export const INCOME_CATEGORIES = CATEGORIES.filter((c) => c.kind !== 'expense')

export const categoryLabel = (id: CategoryId) => CATEGORY_MAP[id]?.label ?? 'Other'
