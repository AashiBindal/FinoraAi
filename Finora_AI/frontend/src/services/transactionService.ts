// Transactions + correction-learning rules.
//
// api mode   → /api/transactions on the Spring backend (services/api/finoraApi.ts)
// local mode → localStorage
//
// Missing on the backend (kept in the browser / not available):
//   - bulk import endpoint      → imports are sent as individual POSTs
//   - PDF statement parsing     → not available
//   - category-rule learning    → rules stay in this browser ("Local only")

import type { CategoryRule, Transaction, TransactionInput } from '../types/finance'
import { transactionApi } from './api/finoraApi'
import { createCollection, type CollectionService } from './collection'
import { DATA_SOURCE } from './config'
import { delay, newId, storage } from './storage'

const byDateDesc = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)

const local = createCollection<Transaction, TransactionInput>({
  key: 'transactions',
  idPrefix: 'txn',
  sort: byDateDesc,
  build: (input) => ({ ...input, source: input.source ?? 'manual', isSample: false }),
})

const RULES_KEY = 'categoryRules'

const collection: CollectionService<Transaction, TransactionInput> = DATA_SOURCE === 'api' ? transactionApi : local

export const transactionService = {
  ...collection,

  /** Upload a PDF statement for server-side extraction. Requires the backend. */
  async extractStatement(file: File): Promise<never> {
    void file
    throw new Error('PDF statement parsing is not available: the backend has no statement-import endpoint yet.')
  },

  rules: {
    async list(): Promise<CategoryRule[]> {
      return delay(storage.get<CategoryRule[]>(RULES_KEY, []))
    },
    async save(rule: Pick<CategoryRule, 'pattern' | 'category'>): Promise<CategoryRule> {
      const rules = storage.get<CategoryRule[]>(RULES_KEY, [])
      // Same pattern → update instead of duplicating
      const existing = rules.find((r) => r.pattern === rule.pattern)
      const saved: CategoryRule = existing
        ? { ...existing, category: rule.category }
        : { id: newId('rule'), ...rule, createdAt: new Date().toISOString(), syncStatus: 'local', timesApplied: 0 }
      storage.set(RULES_KEY, existing ? rules.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...rules])
      return delay(saved)
    },
    async remove(id: string) {
      storage.set(RULES_KEY, storage.get<CategoryRule[]>(RULES_KEY, []).filter((r) => r.id !== id))
      return delay(undefined)
    },
    async recordUse(id: string, count: number) {
      if (count === 0) return
      storage.set(
        RULES_KEY,
        storage.get<CategoryRule[]>(RULES_KEY, []).map((r) => (r.id === id ? { ...r, timesApplied: r.timesApplied + count } : r)),
      )
    },
  },
}
