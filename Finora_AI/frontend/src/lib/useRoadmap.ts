// Shared data + mutations for pages that work with phases, tasks and team.

import { useCallback } from 'react'
import { useToast } from '../components/ui'
import type { TaskInput } from '../types'
import { api } from './api'
import { useAsync } from './useAsync'

export function useRoadmap() {
  const toast = useToast()
  const state = useAsync(
    () =>
      Promise.all([api.phases.list(), api.team.list(), api.tasks.list()]).then(([phases, members, tasks]) => ({
        phases,
        members,
        tasks,
      })),
    [],
  )
  const { reload } = state

  const fail = useCallback((e: unknown) => toast.error(e instanceof Error ? e.message : 'Request failed'), [toast])
  const refresh = useCallback(() => reload(true), [reload])

  async function mutate(fn: () => Promise<unknown>) {
    try {
      await fn()
      await refresh()
      return true
    } catch (e) {
      fail(e)
      return false
    }
  }

  return {
    ...state,
    phases: state.data?.phases ?? [],
    members: state.data?.members ?? [],
    tasks: state.data?.tasks ?? [],
    refresh,
    fail,
    mutate,
    createTask: (data: TaskInput) => mutate(() => api.tasks.create(data)),
    updateTask: (id: number, data: TaskInput) => mutate(() => api.tasks.update(id, data)),
    deleteTask: (id: number) => mutate(() => api.tasks.remove(id)),
  }
}
