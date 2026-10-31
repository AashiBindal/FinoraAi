// Mapping layer between the Finora UI model (src/types/finance.ts) and the
// Spring Boot DTOs, which are kept unchanged. Keys arrive already camelCased
// (services/http.ts converts snake_case), so these types mirror the Java DTOs.
//
// Where the backend has no field for something the UI tracks (merchant,
// subscription usage, goal kind, rich profile details), the value is kept in
// this browser per user (see services/api/extras.ts) and merged back in.

import type {
  BillingFrequency,
  CategoryId,
  Goal,
  GoalInput,
  GoalKind,
  PaymentMethod,
  Subscription,
  SubscriptionInput,
  SubscriptionStatus,
  Transaction,
  TransactionInput,
} from '../../types/finance'
import { nextOccurrence, todayISO } from '../../utils/dates'

// ---------- Backend DTOs (camelCase after conversion) ----------
export type BackendCategory =
  | 'SALARY'
  | 'FOOD'
  | 'RENT'
  | 'TRANSPORT'
  | 'UTILITIES'
  | 'ENTERTAINMENT'
  | 'SHOPPING'
  | 'HEALTH'
  | 'EDUCATION'
  | 'INVESTMENT'
  | 'SUBSCRIPTIONS'
  | 'OTHER'

export interface TransactionDto {
  id: number
  title: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: BackendCategory
  transactionDate: string
  paymentMethod?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}
export type TransactionRequestDto = Omit<TransactionDto, 'id' | 'createdAt' | 'updatedAt'>

export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
export type BackendSubStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
export interface SubscriptionDto {
  id: number
  name: string
  amount: number
  billingCycle: BillingCycle
  category: BackendCategory
  startDate: string
  nextBillingDate: string
  paymentMethod?: string | null
  status: BackendSubStatus
  description?: string | null
  createdAt?: string
}
export type SubscriptionRequestDto = Omit<SubscriptionDto, 'id' | 'createdAt'>

export type GoalCategory = 'EMERGENCY_FUND' | 'EDUCATION' | 'TRAVEL' | 'VEHICLE' | 'HOME' | 'DEBT_REPAYMENT' | 'INVESTMENT' | 'OTHER'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | 'OVERDUE'
export interface GoalDto {
  id: number
  title: string
  description?: string | null
  targetAmount: number
  currentAmount: number
  category: GoalCategory
  targetDate: string
  priority?: string | null
  status: GoalStatus
  monthlyContributionTarget?: number | null
  requiredMonthlyContribution?: number | null
  createdAt?: string
}
export interface GoalRequestDto {
  title: string
  description?: string | null
  targetAmount: number
  currentAmount: number
  category: GoalCategory
  targetDate: string
  priority?: string | null
  status?: GoalStatus
  monthlyContributionTarget?: number | null
}

export interface MoneyProfileDto {
  id?: number
  monthlyIncome: number
  employmentStatus?: string | null
  incomeSource?: string | null
  monthlyFixedExpenses: number
  monthlyVariableExpenses: number
  savingsAmount: number
  existingDebt: number
  financialDependents?: number | null
  preferredCurrency?: string | null
  financialExperienceLevel?: string | null
  financialPriorities?: string | null
  profileCompletionPercentage?: number
  updatedAt?: string
}

/** Spring Data Page - supports both the legacy PageImpl JSON and the VIA_DTO shape. */
export interface PageDto<T> {
  content: T[]
  totalPages?: number
  last?: boolean
  page?: { totalPages?: number; number?: number }
}

// ---------- Categories ----------
const TO_BACKEND: Record<CategoryId, BackendCategory> = {
  food: 'FOOD',
  shopping: 'SHOPPING',
  transport: 'TRANSPORT',
  housing: 'RENT',
  bills: 'UTILITIES',
  healthcare: 'HEALTH',
  education: 'EDUCATION',
  entertainment: 'ENTERTAINMENT',
  salary: 'SALARY',
  investments: 'INVESTMENT',
  other: 'OTHER',
}
const FROM_BACKEND: Record<BackendCategory, CategoryId> = {
  FOOD: 'food',
  SHOPPING: 'shopping',
  TRANSPORT: 'transport',
  RENT: 'housing',
  UTILITIES: 'bills',
  HEALTH: 'healthcare',
  EDUCATION: 'education',
  ENTERTAINMENT: 'entertainment',
  SALARY: 'salary',
  INVESTMENT: 'investments',
  // No separate UI category: shown under Entertainment. The original value is kept on save
  // (see categoryToBackend) so it is never silently rewritten.
  SUBSCRIPTIONS: 'entertainment',
  OTHER: 'other',
}

export const categoryFromBackend = (c: BackendCategory | null | undefined): CategoryId => (c && FROM_BACKEND[c]) || 'other'

/** UI → backend. If the UI category is just the display of the original backend value, keep the original. */
export function categoryToBackend(c: CategoryId, original?: BackendCategory): BackendCategory {
  if (original && FROM_BACKEND[original] === c) return original
  return TO_BACKEND[c] ?? 'OTHER'
}

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Net Banking', 'Auto-debit', 'Cash', 'Other']
export function paymentFromBackend(p: string | null | undefined): PaymentMethod {
  if (!p) return 'Other'
  const hit = PAYMENT_METHODS.find((m) => m.toLowerCase() === p.trim().toLowerCase())
  if (hit) return hit
  const lower = p.toLowerCase()
  if (lower.includes('upi')) return 'UPI'
  if (lower.includes('card')) return 'Card'
  if (lower.includes('bank') || lower.includes('neft') || lower.includes('imps')) return 'Net Banking'
  if (lower.includes('auto') || lower.includes('debit')) return 'Auto-debit'
  if (lower.includes('cash')) return 'Cash'
  return 'Other'
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0)
const date = (v: string | null | undefined) => (v ?? '').slice(0, 10)

// ---------- Transactions ----------
export interface TxExtras {
  merchant?: string
  source?: Transaction['source']
  subscriptionId?: string
  ruleId?: string
}

export function txFromDto(d: TransactionDto, extras: TxExtras = {}): Transaction {
  return {
    id: String(d.id),
    date: date(d.transactionDate),
    description: d.title,
    merchant: extras.merchant ?? d.title,
    amount: num(d.amount),
    type: d.type === 'INCOME' ? 'income' : 'expense',
    category: categoryFromBackend(d.category),
    paymentMethod: paymentFromBackend(d.paymentMethod),
    notes: d.notes ?? undefined,
    source: extras.source ?? 'manual',
    isSample: false,
    subscriptionId: extras.subscriptionId,
    ruleId: extras.ruleId,
  }
}

export function txToRequest(t: TransactionInput | Transaction, originalCategory?: BackendCategory): TransactionRequestDto {
  return {
    title: (t.description || t.merchant || 'Transaction').trim().slice(0, 255),
    amount: Math.round(Math.abs(num(t.amount)) * 100) / 100,
    type: t.type === 'income' ? 'INCOME' : 'EXPENSE',
    category: categoryToBackend(t.category, originalCategory),
    transactionDate: t.date,
    paymentMethod: t.paymentMethod ?? null,
    notes: t.notes ? t.notes.slice(0, 500) : null,
  }
}

export const txExtrasOf = (t: Partial<Transaction>): TxExtras => ({
  merchant: t.merchant && t.merchant !== t.description ? t.merchant : undefined,
  source: t.source && t.source !== 'manual' ? t.source : undefined,
  subscriptionId: t.subscriptionId,
  ruleId: t.ruleId,
})

// ---------- Subscriptions ----------
const CYCLE_TO: Record<BillingFrequency, BillingCycle> = { weekly: 'WEEKLY', monthly: 'MONTHLY', quarterly: 'QUARTERLY', yearly: 'YEARLY' }
const CYCLE_FROM: Record<BillingCycle, BillingFrequency> = { WEEKLY: 'weekly', MONTHLY: 'monthly', QUARTERLY: 'quarterly', YEARLY: 'yearly' }
const STATUS_TO: Record<SubscriptionStatus, BackendSubStatus> = { active: 'ACTIVE', paused: 'PAUSED', cancelled: 'CANCELLED' }
const STATUS_FROM: Record<BackendSubStatus, SubscriptionStatus> = { ACTIVE: 'active', PAUSED: 'paused', CANCELLED: 'cancelled', EXPIRED: 'cancelled' }

export interface SubExtras {
  usage?: Subscription['usage']
  previousAmount?: number
}

export function subFromDto(d: SubscriptionDto, extras: SubExtras = {}): Subscription {
  return {
    id: String(d.id),
    name: d.name,
    category: categoryFromBackend(d.category),
    amount: num(d.amount),
    frequency: CYCLE_FROM[d.billingCycle] ?? 'monthly',
    billingStartDate: date(d.startDate) || date(d.nextBillingDate),
    status: STATUS_FROM[d.status] ?? 'active',
    previousAmount: extras.previousAmount,
    usage: extras.usage ?? 'unknown',
    paymentMethod: paymentFromBackend(d.paymentMethod),
    notes: d.description ?? undefined,
    isSample: false,
  }
}

export function subToRequest(s: SubscriptionInput | Subscription, original?: SubscriptionDto): SubscriptionRequestDto {
  const start = s.billingStartDate || todayISO()
  return {
    name: s.name.trim().slice(0, 255),
    amount: Math.round(num(s.amount) * 100) / 100,
    billingCycle: CYCLE_TO[s.frequency] ?? 'MONTHLY',
    category: categoryToBackend(s.category, original?.category),
    startDate: start,
    // Backend requires it; derived from the start date + frequency (first date on/after today)
    nextBillingDate: nextOccurrence(start, s.frequency),
    paymentMethod: s.paymentMethod ?? null,
    // Keep EXPIRED if the UI still shows it as cancelled
    status: original?.status === 'EXPIRED' && s.status === 'cancelled' ? 'EXPIRED' : STATUS_TO[s.status],
    description: s.notes ? s.notes.slice(0, 500) : null,
  }
}

// ---------- Goals ----------
const KIND_TO: Record<GoalKind, GoalCategory> = {
  emergency: 'EMERGENCY_FUND',
  education: 'EDUCATION',
  travel: 'TRAVEL',
  home: 'HOME',
  purchase: 'OTHER',
  other: 'OTHER',
}
const KIND_FROM: Record<GoalCategory, GoalKind> = {
  EMERGENCY_FUND: 'emergency',
  EDUCATION: 'education',
  TRAVEL: 'travel',
  HOME: 'home',
  VEHICLE: 'purchase',
  DEBT_REPAYMENT: 'other',
  INVESTMENT: 'other',
  OTHER: 'other',
}

export function goalFromDto(d: GoalDto, extras: { kind?: GoalKind } = {}): Goal {
  return {
    id: String(d.id),
    name: d.title,
    kind: extras.kind ?? KIND_FROM[d.category] ?? 'other',
    targetAmount: num(d.targetAmount),
    savedAmount: num(d.currentAmount),
    targetDate: date(d.targetDate),
    monthlyContribution: num(d.monthlyContributionTarget ?? 0),
    createdAt: d.createdAt ?? new Date().toISOString(),
    isSample: false,
  }
}

export function goalToRequest(g: GoalInput | Goal, original?: GoalDto): GoalRequestDto {
  // Keep a more specific backend category (VEHICLE, INVESTMENT…) when the UI kind still matches it
  const category = original && KIND_FROM[original.category] === g.kind ? original.category : KIND_TO[g.kind]
  return {
    title: g.name.trim().slice(0, 255),
    description: original?.description ?? null,
    targetAmount: Math.round(num(g.targetAmount) * 100) / 100,
    currentAmount: Math.max(0, Math.round(num(g.savedAmount) * 100) / 100),
    category,
    targetDate: g.targetDate,
    priority: original?.priority ?? null,
    // Let the backend recompute COMPLETED/OVERDUE from amounts and dates; keep PAUSED/CANCELLED
    status: original && (original.status === 'PAUSED' || original.status === 'CANCELLED') ? original.status : 'ACTIVE',
    monthlyContributionTarget: g.monthlyContribution > 0 ? g.monthlyContribution : null,
  }
}

/** Collect every item of a paged Spring endpoint. */
export function pageInfo<T>(p: PageDto<T> | T[]): { items: T[]; totalPages: number } {
  if (Array.isArray(p)) return { items: p, totalPages: 1 }
  return { items: p.content ?? [], totalPages: p.totalPages ?? p.page?.totalPages ?? (p.last === false ? Infinity : 1) }
}
