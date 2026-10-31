// Typed API client. Every backend call goes through `request`, which
// normalises errors into ApiError so pages can show a helpful message.

import type {
  Activity,
  AgentConfig,
  AgentRun,
  DocSection,
  Health,
  Integration,
  IntegrationInput,
  Phase,
  PhaseInput,
  ProgressSummary,
  Project,
  ProjectUpdate,
  Task,
  TaskInput,
  TeamMember,
  TeamMemberInput,
  Tool,
} from '../types'

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code = 'error') {
    super(message)
    this.status = status
    this.code = code
  }
  get isNetwork() {
    return this.status === 0
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
  } catch {
    throw new ApiError('Cannot reach the backend. Is it running on http://localhost:8000?', 0, 'network')
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // non-JSON body (e.g. proxy error page)
  }
  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: string } } | null)?.error
    // Vite's proxy answers 500/502/504 with no JSON when the backend is down
    if (!err && res.status >= 500) {
      throw new ApiError('Backend unavailable. Start it with `uvicorn app.main:app --reload`.', 0, 'network')
    }
    throw new ApiError(err?.message ?? `Request failed (${res.status})`, res.status, err?.code)
  }
  return body as T
}

const json = (data: unknown) => JSON.stringify(data)

export const api = {
  health: () => request<Health>('/health'),

  project: {
    get: () => request<Project>('/project'),
    update: (data: ProjectUpdate) => request<Project>('/project', { method: 'PATCH', body: json(data) }),
    activities: (limit = 20) => request<Activity[]>(`/project/activities?limit=${limit}`),
  },

  phases: {
    list: () => request<Phase[]>('/phases'),
    create: (data: PhaseInput) => request<Phase>('/phases', { method: 'POST', body: json(data) }),
    update: (id: number, data: PhaseInput) => request<Phase>(`/phases/${id}`, { method: 'PATCH', body: json(data) }),
    remove: (id: number) => request<void>(`/phases/${id}`, { method: 'DELETE' }),
  },

  tasks: {
    list: () => request<Task[]>('/tasks'),
    create: (data: TaskInput) => request<Task>('/tasks', { method: 'POST', body: json(data) }),
    update: (id: number, data: TaskInput) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: json(data) }),
    remove: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  progress: () => request<ProgressSummary>('/progress'),

  team: {
    list: () => request<TeamMember[]>('/team'),
    create: (data: TeamMemberInput) => request<TeamMember>('/team', { method: 'POST', body: json(data) }),
    update: (id: number, data: TeamMemberInput) => request<TeamMember>(`/team/${id}`, { method: 'PATCH', body: json(data) }),
    remove: (id: number) => request<void>(`/team/${id}`, { method: 'DELETE' }),
  },

  docs: {
    list: () => request<DocSection[]>('/docs'),
    update: (slug: string, data: { title?: string; content?: string }) =>
      request<DocSection>(`/docs/${slug}`, { method: 'PATCH', body: json(data) }),
  },

  integrations: {
    list: () => request<Integration[]>('/integrations'),
    create: (data: IntegrationInput) => request<Integration>('/integrations', { method: 'POST', body: json(data) }),
    update: (id: number, data: IntegrationInput) =>
      request<Integration>(`/integrations/${id}`, { method: 'PATCH', body: json(data) }),
    remove: (id: number) => request<void>(`/integrations/${id}`, { method: 'DELETE' }),
  },

  agent: {
    config: () => request<AgentConfig>('/agent/config'),
    tools: () => request<Tool[]>('/agent/tools'),
    run: (message: string, sessionId = 'default') =>
      request<AgentRun>('/agent/run', { method: 'POST', body: json({ message, session_id: sessionId }) }),
    runs: (sessionId = 'default') => request<AgentRun[]>(`/agent/runs?session_id=${encodeURIComponent(sessionId)}`),
    clear: (sessionId = 'default') =>
      request<void>(`/agent/runs?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  },
}
