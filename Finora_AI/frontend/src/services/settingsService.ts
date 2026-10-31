// App preferences (currency display, alert toggles, coach style).
// The backend has no endpoint for these UI preferences, so they are stored in this
// browser in both modes (per signed-in user when using the backend).

import { DEFAULT_SETTINGS } from '../data/sampleData'
import type { AppSettings } from '../types/finance'
import { delay, storage } from './storage'

export const settingsService = {
  async get(): Promise<AppSettings> {
    const stored = storage.get<Partial<AppSettings>>('settings', {})
    return delay({ ...DEFAULT_SETTINGS, ...stored, notifications: { ...DEFAULT_SETTINGS.notifications, ...stored.notifications } })
  },
  async save(settings: AppSettings): Promise<AppSettings> {
    storage.set('settings', settings)
    return delay(settings)
  },
}
