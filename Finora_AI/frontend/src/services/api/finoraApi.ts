// REST adapters for the Finora Spring Boot backend. Each adapter has the same
// shape as the local-storage collection (services/collection.ts), so pages and
// useFinance() don't know which data source is active.
//
// Endpoints used (all require "Authorization: Bearer <jwt>"):
//   /api/transactions        GET (paged) · POST · GET/PUT/DELETE /{id}
//   /api/subscriptions       GET (paged) · POST · GET/PUT/DELETE /{id}
//   /api/goals               GET (paged) · POST · GET/PUT/DELETE /{id} · POST /{id}/contribute
//   /api/profile             GET · POST (create or update)
//   /api/users/profile       PUT (name, savings target)
//   /api/demo/seed           POST (adds the backend's demo ledger to the current account)

import { buildSampleProfile } from '../../data/sampleData'
import type { Goal, GoalInput, MoneyProfile, Subscription, SubscriptionInput, Transaction, TransactionInput } from '../../types/finance'
import { profileFixed, profileIncome, totalBudget } from '../../utils/finance'
import { authStore } from '../authStore'
import { http, HttpError } from '../http'
import { storage } from '../storage'
import {
  goalFromDto,
  goalToRequest,
  pageInfo,
  subFromDto,
  subToRequest,
  txExtrasOf,
  txFromDto,
  txToRequest,
  type GoalDto,
  type MoneyProfileDto,
  type PageDto,
  type SubExtras,
  type SubscriptionDto,
  type TransactionDto,
  type TxExtras,
} from './mappers'

// ---------- UI-only fields kept in this browser (per user) ----------
function extrasStore<T extends object>(key: string) {
  const all = () => storage.get<Record<string, T>>(key, {})
  return {
    get: (id: string): T => all()[id] ?? ({} as T),
    set(id: string, value: T) {
      const map = all()
      const clean = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
      if (Object.keys(clean).length) map[id] = clean
      else delete map[id]
      storage.set(key, map)
    },
    remove(id: string) {
      const map = all()
      delete map[id]
      storage.set(key, map)
    },
  }
}
const txExtras = extrasStore<TxExtras>('api:txExtras')
const subExtras = extrasStore<SubExtras>('api:subExtras')
const goalExtras = extrasStore<{ kind?: Goal['kind'] }>('api:goalExtras')

/** Fetch every page of a Spring `Page<T>` endpoint. */
async function listAll<T>(path: string, sortBy: string, direction: 'ASC' | 'DESC'): Promise<T[]> {
  const size = 200
  const out: T[] = []
  for (let page = 0; page < 100; page++) {
    const res = await http<PageDto<T> | T[]>(`${path}?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`)
    const { items, totalPages } = pageInfo(res)
    out.push(...items)
    if (items.length < size || page + 1 >= totalPages) break
  }
  return out
}

/** Run async jobs with limited parallelism, keeping input order. */
async function mapLimit<I, O>(items: I[], limit: number, fn: (item: I) => Promise<O>): Promise<O[]> {
  const out = new Array<O>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

// ---------- Transactions ----------
export const transactionApi = {
  async list(): Promise<Transaction[]> {
    const rows = await listAll<TransactionDto>('/api/transactions', 'transactionDate', 'DESC')
    return rows.map((d) => txFromDto(d, txExtras.get(String(d.id))))
  },
  async create(input: TransactionInput): Promise<Transaction> {
    const d = await http<TransactionDto>('/api/transactions', { method: 'POST', body: txToRequest(input) })
    const extras = txExtrasOf({ ...input, source: input.source ?? 'manual' })
    txExtras.set(String(d.id), extras)
    return txFromDto(d, extras)
  },
  /** No bulk endpoint exists, so imports are sent as individual POSTs (4 at a time). */
  async createMany(inputs: TransactionInput[]): Promise<Transaction[]> {
    return mapLimit(inputs, 4, (i) => transactionApi.create(i))
  },
  async update(id: string, patch: Partial<Transaction>): Promise<Transaction> {
    const current = await http<TransactionDto>(`/api/transactions/${id}`)
    const merged = { ...txFromDto(current, txExtras.get(id)), ...patch, id }
    const d = await http<TransactionDto>(`/api/transactions/${id}`, { method: 'PUT', body: txToRequest(merged, current.category) })
    const extras = txExtrasOf(merged)
    txExtras.set(id, extras)
    return txFromDto(d, extras)
  },
  async remove(id: string): Promise<void> {
    await http<void>(`/api/transactions/${id}`, { method: 'DELETE' })
    txExtras.remove(id)
  },
}

// ---------- Subscriptions ----------
export const subscriptionApi = {
  async list(): Promise<Subscription[]> {
    const rows = await listAll<SubscriptionDto>('/api/subscriptions', 'nextBillingDate', 'ASC')
    return rows.map((d) => subFromDto(d, subExtras.get(String(d.id)))).sort((a, b) => b.amount - a.amount)
  },
  async create(input: SubscriptionInput): Promise<Subscription> {
    const d = await http<SubscriptionDto>('/api/subscriptions', { method: 'POST', body: subToRequest(input) })
    const extras = { usage: input.usage, previousAmount: input.previousAmount }
    subExtras.set(String(d.id), extras)
    return subFromDto(d, extras)
  },
  async createMany(inputs: SubscriptionInput[]): Promise<Subscription[]> {
    return mapLimit(inputs, 4, (i) => subscriptionApi.create(i))
  },
  async update(id: string, patch: Partial<Subscription>): Promise<Subscription> {
    const current = await http<SubscriptionDto>(`/api/subscriptions/${id}`)
    const merged = { ...subFromDto(current, subExtras.get(id)), ...patch, id }
    const d = await http<SubscriptionDto>(`/api/subscriptions/${id}`, { method: 'PUT', body: subToRequest(merged, current) })
    const extras = { usage: merged.usage, previousAmount: merged.previousAmount }
    subExtras.set(id, extras)
    return subFromDto(d, extras)
  },
  async remove(id: string): Promise<void> {
    await http<void>(`/api/subscriptions/${id}`, { method: 'DELETE' })
    subExtras.remove(id)
  },
}

// ---------- Goals ----------
export const goalApi = {
  async list(): Promise<Goal[]> {
    const rows = await listAll<GoalDto>('/api/goals', 'targetDate', 'ASC')
    return rows.map((d) => goalFromDto(d, goalExtras.get(String(d.id))))
  },
  async create(input: GoalInput): Promise<Goal> {
    const d = await http<GoalDto>('/api/goals', { method: 'POST', body: goalToRequest(input) })
    goalExtras.set(String(d.id), { kind: input.kind })
    return goalFromDto(d, { kind: input.kind })
  },
  async createMany(inputs: GoalInput[]): Promise<Goal[]> {
    return mapLimit(inputs, 4, (i) => goalApi.create(i))
  },
  async update(id: string, patch: Partial<Goal>): Promise<Goal> {
    const current = await http<GoalDto>(`/api/goals/${id}`)
    const merged = { ...goalFromDto(current, goalExtras.get(id)), ...patch, id }
    const d = await http<GoalDto>(`/api/goals/${id}`, { method: 'PUT', body: goalToRequest(merged, current) })
    goalExtras.set(id, { kind: merged.kind })
    return goalFromDto(d, { kind: merged.kind })
  },
  async remove(id: string): Promise<void> {
    await http<void>(`/api/goals/${id}`, { method: 'DELETE' })
    goalExtras.remove(id)
  },
  /** Deposits use POST /contribute; withdrawals (negative) update currentAmount via PUT. */
  async contribute(goal: Goal, amount: number): Promise<Goal> {
    if (amount > 0) {
      const d = await http<GoalDto>(`/api/goals/${goal.id}/contribute`, { method: 'POST', body: { amount: Math.round(amount * 100) / 100 } })
      return goalFromDto(d, goalExtras.get(goal.id))
    }
    return goalApi.update(goal.id, { savedAmount: Math.max(0, goal.savedAmount + amount) })
  },
}

// ---------- Money profile ----------
// The backend stores a flat summary (income, fixed/variable totals, savings). The
// itemised profile the UI edits (income sources, fixed costs, budgets, preferences)
// is kept in this browser and the totals are synced to the backend on every save.
const PROFILE_DETAILS = 'api:profileDetails'

function emptyProfile(): MoneyProfile {
  const user = authStore.get()?.user
  const base = buildSampleProfile()
  return {
    ...base,
    name: user?.fullName ?? '',
    email: user?.email ?? '',
    city: '',
    incomeSources: [],
    fixedExpenses: [],
    variableBudgets: {},
    emergencyFund: 0,
    savingsBalance: 0,
    preferences: { ...base.preferences, constraints: '' },
    isSample: false,
    updatedAt: new Date().toISOString(),
  }
}

function profileFromDto(d: MoneyProfileDto): MoneyProfile {
  const p = emptyProfile()
  if (d.monthlyIncome > 0) p.incomeSources = [{ id: 'inc_server', name: d.incomeSource || 'Monthly income', amount: Number(d.monthlyIncome), kind: 'salary' }]
  if (d.monthlyFixedExpenses > 0) p.fixedExpenses = [{ id: 'fix_server', name: 'Fixed expenses', amount: Number(d.monthlyFixedExpenses), category: 'housing' }]
  p.savingsBalance = Number(d.savingsAmount ?? 0)
  p.preferences.constraints = d.financialPriorities ?? ''
  if (d.updatedAt) p.updatedAt = d.updatedAt
  return p
}

export const profileApi = {
  async get(): Promise<MoneyProfile> {
    const local = storage.get<MoneyProfile | null>(PROFILE_DETAILS, null)
    let server: MoneyProfileDto | null = null
    try {
      server = await http<MoneyProfileDto>('/api/profile')
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 404)) throw e
    }
    const user = authStore.get()?.user
    const profile = local ?? (server ? profileFromDto(server) : emptyProfile())
    // Name/email always come from the account
    return { ...profile, name: user?.fullName ?? profile.name, email: user?.email ?? profile.email, isSample: false }
  },
  async save(profile: MoneyProfile): Promise<MoneyProfile> {
    const body: MoneyProfileDto = {
      monthlyIncome: profileIncome(profile),
      incomeSource: profile.incomeSources.map((i) => i.name).join(', ').slice(0, 100) || null,
      monthlyFixedExpenses: profileFixed(profile),
      monthlyVariableExpenses: totalBudget(profile),
      savingsAmount: profile.savingsBalance + profile.emergencyFund,
      existingDebt: 0,
      preferredCurrency: 'INR',
      financialPriorities: profile.preferences.constraints.slice(0, 255) || null,
    }
    const saved = await http<MoneyProfileDto>('/api/profile', { method: 'POST', body })

    // Keep the account name and savings target in sync (email cannot be changed via the API)
    const session = authStore.get()
    if (session && profile.name.trim() && profile.name.trim() !== session.user.fullName) {
      await http('/api/users/profile', {
        method: 'PUT',
        body: { fullName: profile.name.trim(), currency: 'INR', savingsGoalPercent: profile.preferences.savingsRateTarget },
      })
      authStore.updateUser({ fullName: profile.name.trim() })
    }

    const result: MoneyProfile = { ...profile, email: session?.user.email ?? profile.email, isSample: false, updatedAt: saved.updatedAt ?? new Date().toISOString() }
    storage.set(PROFILE_DETAILS, result)
    return result
  },
}

// ---------- Backend demo data ----------
export const demoApi = {
  /** Adds the backend's demo ledger (4 months of transactions, budgets, 2 goals) to the current account. */
  seed: () => http<{ status: string; message: string }>('/api/demo/seed', { method: 'POST' }),
}
