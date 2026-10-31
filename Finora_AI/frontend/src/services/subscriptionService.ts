// Recurring payments.
// api mode   → /api/subscriptions on the Spring backend (services/api/finoraApi.ts)
// local mode → localStorage
// Usage is self-reported by the user; Finora does not track real usage. The backend
// has no usage / previous-price fields, so those stay in this browser.

import type { Subscription, SubscriptionInput } from '../types/finance'
import { subscriptionApi } from './api/finoraApi'
import { createCollection, type CollectionService } from './collection'
import { DATA_SOURCE } from './config'

const local = createCollection<Subscription, SubscriptionInput>({
  key: 'subscriptions',
  idPrefix: 'sub',
  sort: (a, b) => b.amount - a.amount,
  build: (input) => ({ ...input, isSample: false }),
})

export const subscriptionService: CollectionService<Subscription, SubscriptionInput> = DATA_SOURCE === 'api' ? subscriptionApi : local
