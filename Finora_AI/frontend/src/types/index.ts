// API contract types. Keep in sync with workspace-api/app/schemas/__init__.py.

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type Layer = 'frontend' | 'backend' | 'database' | 'agent' | 'tools'
export type IntegrationStatus = 'planned' | 'in_progress' | 'connected'

export interface Project {
  id: number
  name: string
  tagline: string
  description: string
  hackathon_name: string
  problem_statement: string
  target_users: string
  proposed_solution: string
  key_features: string
  expected_impact: string
  objectives: string
  demo_date: string
  updated_at: string
}
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'updated_at'>>

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  phase_id: number | null
  assignee_id: number | null
  due_date: string | null
  is_sample: boolean
  created_at: string
  updated_at: string
}
export type TaskInput = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'phase_id' | 'assignee_id' | 'due_date'>>

export interface Phase {
  id: number
  order: number
  title: string
  description: string
  status: PhaseStatus
  deadline: string | null
  auto_status: boolean
  tasks: Task[]
  progress: number
  task_count: number
  done_count: number
}
export type PhaseInput = Partial<Pick<Phase, 'title' | 'description' | 'status' | 'deadline' | 'order' | 'auto_status'>>

export interface PhaseProgress {
  id: number
  title: string
  order: number
  status: PhaseStatus
  deadline: string | null
  total: number
  done: number
  in_progress: number
  progress: number
}

export interface Milestone {
  phase_id: number
  title: string
  deadline: string | null
  status: PhaseStatus
  progress: number
  days_remaining: number | null
}

export interface AssigneeProgress {
  assignee_id: number | null
  name: string
  total: number
  done: number
  in_progress: number
  progress: number
}

export interface ProgressSummary {
  overall_progress: number
  total_tasks: number
  completed_tasks: number
  active_tasks: number
  pending_tasks: number
  phases_completed: number
  phases_total: number
  current_phase: PhaseProgress | null
  phases: PhaseProgress[]
  milestones: Milestone[]
  by_assignee: AssigneeProgress[]
}

export interface TeamMember {
  id: number
  name: string
  role: string
  responsibilities: string
  email: string
  github: string
  is_sample: boolean
}
export type TeamMemberInput = Partial<Omit<TeamMember, 'id' | 'is_sample'>>

export interface DocSection {
  id: number
  slug: string
  title: string
  content: string
  order: number
  updated_at: string
}

export interface Integration {
  id: number
  name: string
  layer: Layer
  status: IntegrationStatus
  description: string
  is_sample: boolean
}
export type IntegrationInput = Partial<Omit<Integration, 'id' | 'is_sample'>>

export interface Activity {
  id: number
  kind: string
  message: string
  created_at: string
}

export type AgentStepType = 'thought' | 'tool_call' | 'tool_result' | 'final' | 'error' | 'info'
export interface AgentStep {
  index: number
  type: AgentStepType
  content: string
  tool: string | null
  tool_input: Record<string, unknown> | null
  duration_ms: number
}

export type AgentRunStatus = 'completed' | 'failed' | 'not_configured' | 'max_steps'
export interface AgentRun {
  id: number
  session_id: string
  input: string
  output: string
  status: AgentRunStatus
  provider: string
  model: string
  steps: AgentStep[]
  error: string
  duration_ms: number
  created_at: string
}

export interface AgentConfig {
  provider: string
  model: string
  configured: boolean
  base_url: string
  max_steps: number
  message: string
  supported_providers: string[]
}

export interface Tool {
  name: string
  description: string
  category: string
  parameters: Record<string, unknown>
}

export interface Health {
  status: 'ok' | 'degraded'
  app: string
  environment: string
  database: string
  database_engine: string
  ai_provider_configured: boolean
}
