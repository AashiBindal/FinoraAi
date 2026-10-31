// Smart alerts are computed by rules in utils/alerts.ts from the user's data.
// This service only stores which alerts the user has read.
// Alerts are computed in the browser (utils/alerts.ts); read/unread state is stored in this browser.
// The Spring backend has no alerts endpoint yet.

import { delay, storage } from './storage'

/** Read/unread state for computed alerts (alerts themselves are derived locally). */
export const alertService = {
  async readIds(): Promise<string[]> {
    return delay(storage.get<string[]>('alertsRead', []))
  },
  async setRead(ids: string[], read: boolean): Promise<string[]> {
    const current = new Set(storage.get<string[]>('alertsRead', []))
    ids.forEach((id) => (read ? current.add(id) : current.delete(id)))
    const out = [...current]
    storage.set('alertsRead', out)
    return delay(out, 0)
  },
}
