// The user's money profile (income, fixed costs, budgets, preferences).
// api mode   → GET /api/profile, POST /api/profile (flat totals) - itemised details kept in this browser
// local mode → localStorage

import type { MoneyProfile } from '../types/finance'
import { profileApi } from './api/finoraApi'
import { DATA_SOURCE } from './config'
import { delay, storage } from './storage'

export const financeProfileService = {
  async get(): Promise<MoneyProfile | null> {
    if (DATA_SOURCE === 'api') return profileApi.get()
    return delay(storage.get<MoneyProfile | null>('profile', null))
  },
  async save(profile: MoneyProfile): Promise<MoneyProfile> {
    if (DATA_SOURCE === 'api') return profileApi.save(profile)
    const saved = { ...profile, isSample: false, updatedAt: new Date().toISOString() }
    storage.set('profile', saved)
    return delay(saved)
  },
}
