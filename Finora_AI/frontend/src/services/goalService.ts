// Financial goals.
// api mode   → /api/goals on the Spring backend (deposits via POST /api/goals/{id}/contribute)
// local mode → localStorage

import type { Goal, GoalInput } from '../types/finance'
import { goalApi } from './api/finoraApi'
import { createCollection } from './collection'
import { DATA_SOURCE } from './config'

const goalCollection = createCollection<Goal, GoalInput>({
  key: 'goals',
  idPrefix: 'goal',
  sort: (a, b) => a.targetDate.localeCompare(b.targetDate),
  build: (input) => ({ ...input, createdAt: new Date().toISOString(), isSample: false }),
})

const localGoals = {
  ...goalCollection,
  /** Add money to a goal (negative to withdraw). */
  async contribute(goal: Goal, amount: number) {
    return goalCollection.update(goal.id, { savedAmount: Math.max(0, goal.savedAmount + amount) })
  },
}

export const goalService: typeof localGoals = DATA_SOURCE === 'api' ? goalApi : localGoals
