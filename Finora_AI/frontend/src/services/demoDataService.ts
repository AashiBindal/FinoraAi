// Sample-data lifecycle: seed on first visit, reset, clear, export.
// Local mode only - with a real backend this file is not used.

import {
  buildSampleGoals,
  buildSampleProfile,
  buildSampleSubscriptions,
  buildSampleTransactions,
  DEFAULT_SETTINGS,
  sampleAnchorMonth,
} from '../data/sampleData'
import type { FinanceSnapshot, MoneyProfile } from '../types/finance'
import { DATA_SOURCE } from './config'
import { storage } from './storage'

const SEEDED_KEY = 'seeded'

export const demoDataService = {
  /** Seed sample data once. Returns true if it seeded. */
  ensureSeeded(): boolean {
    if (DATA_SOURCE === 'api' || storage.get(SEEDED_KEY, false)) return false
    this.loadSample()
    return true
  },

  loadSample() {
    const anchor = sampleAnchorMonth()
    storage.set('transactions', buildSampleTransactions(anchor))
    storage.set('subscriptions', buildSampleSubscriptions(anchor))
    storage.set('goals', buildSampleGoals(anchor))
    storage.set('profile', buildSampleProfile())
    storage.set('settings', DEFAULT_SETTINGS)
    storage.set('alertsRead', [])
    storage.set('categoryRules', [])
    storage.remove('coachHistory')
    storage.set(SEEDED_KEY, true)
  },

  /** Remove everything and start with an empty profile (keeps the seeded flag so samples don't return). */
  clearAll() {
    storage.clearAll()
    const empty: MoneyProfile = {
      ...buildSampleProfile(),
      name: '',
      email: '',
      city: '',
      incomeSources: [],
      fixedExpenses: [],
      variableBudgets: {},
      emergencyFund: 0,
      savingsBalance: 0,
      isSample: false,
    }
    empty.preferences.constraints = ''
    storage.set('profile', empty)
    storage.set(SEEDED_KEY, true)
  },

  /** Download data as JSON (no dependency needed). Pass the loaded snapshot to export what is on screen (backend mode). */
  exportJson(snapshot?: FinanceSnapshot) {
    const keys = ['transactions', 'subscriptions', 'goals', 'profile', 'settings', 'categoryRules', 'alertsRead']
    const data = snapshot ?? Object.fromEntries(keys.map((k) => [k, storage.get(k, null)]))
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Finora AI', data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finora-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
}
