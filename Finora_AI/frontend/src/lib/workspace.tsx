// App-wide state: the project record and backend health.
// Pages that edit the project call `refreshProject()` so the sidebar updates.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Health, Project } from '../types'
import { api } from './api'

interface WorkspaceState {
  project: Project | null
  health: Health | null
  backendOnline: boolean | null // null = still checking
  refreshProject: () => Promise<void>
  setProject: (p: Project) => void
}

const WorkspaceContext = createContext<WorkspaceState | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      setHealth(await api.health())
      setBackendOnline(true)
    } catch {
      setBackendOnline(false)
    }
  }, [])

  const refreshProject = useCallback(async () => {
    try {
      setProject(await api.project.get())
    } catch {
      /* surfaced via backendOnline */
    }
  }, [])

  useEffect(() => {
    void checkHealth()
    void refreshProject()
    const id = setInterval(checkHealth, 15000)
    return () => clearInterval(id)
  }, [checkHealth, refreshProject])

  // Load project once the backend comes back online
  useEffect(() => {
    if (backendOnline && !project) void refreshProject()
  }, [backendOnline, project, refreshProject])

  return (
    <WorkspaceContext.Provider value={{ project, health, backendOnline, refreshProject, setProject }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
