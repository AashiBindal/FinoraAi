// FinanceProvider: loads all finance data through the service layer once,
// keeps it in React state and exposes mutations. Because every page reads
// from here, the dashboard, alerts and reports update the moment data changes.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '../components/ui'
import { sampleAnchorMonth } from '../data/sampleData'
import { demoApi } from '../services/api/finoraApi'
import { DATA_SOURCE } from '../services/config'
import {
  alertService,
  demoDataService,
  financeProfileService,
  goalService,
  settingsService,
  subscriptionService,
  transactionService,
} from '../services'
import type {
  AppSettings,
  CategoryId,
  CategoryRule,
  FinanceAlert,
  FinanceSnapshot,
  Goal,
  GoalInput,
  MonthKey,
  MoneyProfile,
  Subscription,
  SubscriptionInput,
  Transaction,
  TransactionInput,
} from '../types/finance'
import { computeAlerts } from '../utils/alerts'
import { matchRule } from '../utils/categorize'
import { monthKey, today } from '../utils/dates'
import { availableMonths } from '../utils/finance'

interface FinanceContextValue {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  reload: () => Promise<void>

  data: FinanceSnapshot | null
  /** Month selected in the top bar; every page reports on it */
  month: MonthKey
  setMonth: (m: MonthKey) => void
  months: MonthKey[]
  hasSampleData: boolean

  alerts: FinanceAlert[]
  unreadAlerts: number
  setAlertsRead: (ids: string[], read: boolean) => Promise<void>

  addTransaction: (t: TransactionInput) => Promise<Transaction | undefined>
  addTransactions: (t: TransactionInput[]) => Promise<number>
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<void>
  /** Change a category; optionally remember it as a rule and apply to similar transactions */
  recategorize: (t: Transaction, category: CategoryId, opts: { remember: boolean; applyToSimilar: boolean; pattern: string }) => Promise<number>
  deleteRule: (id: string) => Promise<void>

  saveSubscription: (input: SubscriptionInput, id?: string) => Promise<boolean>
  deleteSubscription: (id: string) => Promise<void>

  saveGoal: (input: GoalInput, id?: string) => Promise<boolean>
  contributeToGoal: (goal: Goal, amount: number) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  saveProfile: (p: MoneyProfile) => Promise<boolean>
  saveSettings: (s: AppSettings) => Promise<boolean>

  resetDemoData: () => Promise<void>
  clearAllData: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<FinanceContextValue['status']>('loading')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FinanceSnapshot | null>(null)
  const [readIds, setReadIds] = useState<string[]>([])
  const [month, setMonth] = useState<MonthKey>(() => (DATA_SOURCE === 'api' ? monthKey(today()) : sampleAnchorMonth()))

  const fail = useCallback((e: unknown) => toast.error(e instanceof Error ? e.message : 'Something went wrong'), [toast])

  const reload = useCallback(async () => {
    setStatus('loading')
    try {
      demoDataService.ensureSeeded()
      const [transactions, subscriptions, goals, profile, settings, rules, read] = await Promise.all([
        transactionService.list(),
        subscriptionService.list(),
        goalService.list(),
        financeProfileService.get(),
        settingsService.get(),
        transactionService.rules.list(),
        alertService.readIds(),
      ])
      if (!profile) throw new Error('No money profile found. Reset the demo data from Settings.') // local mode only; the API always returns one
      setData({ transactions, subscriptions, goals, profile, settings, rules })
      setReadIds(read)
      const ms = availableMonths(transactions)
      setMonth((m) => (ms.length ? (ms.includes(m) ? m : ms[ms.length - 1]) : monthKey(today())))
      setError(null)
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your data')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const patch = (fn: (d: FinanceSnapshot) => FinanceSnapshot) => setData((d) => (d ? fn(d) : d))
  const sortTx = (list: Transaction[]) => [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  const months = useMemo(() => {
    const ms = data ? availableMonths(data.transactions) : []
    const current = monthKey(today())
    return ms.length ? ms : [current]
  }, [data])

  const alerts = useMemo(
    () =>
      data
        ? computeAlerts({ month, transactions: data.transactions, subscriptions: data.subscriptions, goals: data.goals, profile: data.profile, settings: data.settings, readIds: new Set(readIds) })
        : [],
    [data, month, readIds],
  )

  const value: FinanceContextValue = {
    status,
    error,
    reload,
    data,
    month,
    setMonth,
    months,
    hasSampleData: !!data && (data.profile.isSample || data.transactions.some((t) => t.isSample)),
    alerts,
    unreadAlerts: alerts.filter((a) => !a.read).length,

    async setAlertsRead(ids, read) {
      setReadIds(await alertService.setRead(ids, read))
    },

    async addTransaction(input) {
      try {
        const t = await transactionService.create(input)
        patch((d) => ({ ...d, transactions: sortTx([t, ...d.transactions]) }))
        return t
      } catch (e) {
        fail(e)
      }
    },
    async addTransactions(inputs) {
      try {
        const created = await transactionService.createMany(inputs)
        const ruleCounts = new Map<string, number>()
        created.forEach((t) => t.ruleId && ruleCounts.set(t.ruleId, (ruleCounts.get(t.ruleId) ?? 0) + 1))
        for (const [id, n] of ruleCounts) await transactionService.rules.recordUse(id, n)
        patch((d) => ({ ...d, transactions: sortTx([...created, ...d.transactions]) }))
        return created.length
      } catch (e) {
        fail(e)
        return 0
      }
    },
    async updateTransaction(id, changes) {
      try {
        const t = await transactionService.update(id, changes)
        patch((d) => ({ ...d, transactions: sortTx(d.transactions.map((x) => (x.id === id ? t : x))) }))
        return true
      } catch (e) {
        fail(e)
        return false
      }
    },
    async deleteTransaction(id) {
      try {
        await transactionService.remove(id)
        patch((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id) }))
      } catch (e) {
        fail(e)
      }
    },
    async recategorize(t, category, opts) {
      if (!data) return 0
      try {
        let rule: CategoryRule | undefined
        if (opts.remember && opts.pattern.trim()) {
          rule = await transactionService.rules.save({ pattern: opts.pattern.trim().toLowerCase(), category })
        }
        const targets = [t.id]
        if (opts.applyToSimilar && opts.pattern.trim()) {
          const pseudoRule = [{ id: 'tmp', pattern: opts.pattern.trim(), category, createdAt: '', syncStatus: 'local' as const, timesApplied: 0 }]
          data.transactions
            .filter((x) => x.id !== t.id && x.type === t.type && x.category !== category && matchRule(`${x.merchant} ${x.description}`, pseudoRule))
            .forEach((x) => targets.push(x.id))
        }
        const updated = await Promise.all(targets.map((id) => transactionService.update(id, { category, ruleId: rule?.id })))
        if (rule) await transactionService.rules.recordUse(rule.id, targets.length)
        const rules = await transactionService.rules.list()
        const byId = new Map(updated.map((u) => [u.id, u]))
        patch((d) => ({ ...d, rules, transactions: d.transactions.map((x) => byId.get(x.id) ?? x) }))
        return targets.length
      } catch (e) {
        fail(e)
        return 0
      }
    },
    async deleteRule(id) {
      try {
        await transactionService.rules.remove(id)
        patch((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== id) }))
      } catch (e) {
        fail(e)
      }
    },

    async saveSubscription(input, id) {
      try {
        const s = id ? await subscriptionService.update(id, input as Partial<Subscription>) : await subscriptionService.create(input)
        patch((d) => ({ ...d, subscriptions: id ? d.subscriptions.map((x) => (x.id === id ? s : x)) : [s, ...d.subscriptions] }))
        return true
      } catch (e) {
        fail(e)
        return false
      }
    },
    async deleteSubscription(id) {
      try {
        await subscriptionService.remove(id)
        patch((d) => ({ ...d, subscriptions: d.subscriptions.filter((x) => x.id !== id) }))
      } catch (e) {
        fail(e)
      }
    },

    async saveGoal(input, id) {
      try {
        const g = id ? await goalService.update(id, input as Partial<Goal>) : await goalService.create(input)
        patch((d) => ({ ...d, goals: (id ? d.goals.map((x) => (x.id === id ? g : x)) : [...d.goals, g]).sort((a, b) => a.targetDate.localeCompare(b.targetDate)) }))
        return true
      } catch (e) {
        fail(e)
        return false
      }
    },
    async contributeToGoal(goal, amount) {
      try {
        const g = await goalService.contribute(goal, amount)
        patch((d) => ({ ...d, goals: d.goals.map((x) => (x.id === g.id ? g : x)) }))
      } catch (e) {
        fail(e)
      }
    },
    async deleteGoal(id) {
      try {
        await goalService.remove(id)
        patch((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== id) }))
      } catch (e) {
        fail(e)
      }
    },

    async saveProfile(p) {
      try {
        const saved = await financeProfileService.save(p)
        patch((d) => ({ ...d, profile: saved }))
        return true
      } catch (e) {
        fail(e)
        return false
      }
    },
    async saveSettings(s) {
      try {
        const saved = await settingsService.save(s)
        patch((d) => ({ ...d, settings: saved }))
        return true
      } catch (e) {
        fail(e)
        return false
      }
    },

    async resetDemoData() {
      if (DATA_SOURCE === 'api') {
        // Backend demo seed: ADDS 4 months of sample transactions, budgets and 2 goals to this account
        try {
          await demoApi.seed()
        } catch (e) {
          fail(e)
          return
        }
        await reload()
        return
      }
      demoDataService.loadSample()
      setMonth(sampleAnchorMonth())
      await reload()
    },
    async clearAllData() {
      if (DATA_SOURCE === 'api') {
        toast.error('Bulk delete is not available: the backend has no endpoint for it. Delete records individually.')
        return
      }
      demoDataService.clearAll()
      await reload()
    },
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside <FinanceProvider>')
  return ctx
}

/** Convenience for pages that only render once data is loaded (the shell guarantees it). */
export function useFinanceData() {
  const ctx = useFinance()
  if (!ctx.data) throw new Error('Finance data not loaded yet')
  return { ...ctx, data: ctx.data }
}
