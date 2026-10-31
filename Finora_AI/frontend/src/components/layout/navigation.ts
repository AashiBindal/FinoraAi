import type { IconName } from '../ui'

export interface NavItem {
  path: string
  label: string
  icon: IconName
}

// AgentForge dev-workspace navigation (mounted under /workspace).
// Single source of truth for sidebar entries and routes.
export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { path: '/workspace', label: 'Dashboard', icon: 'dashboard' },
      { path: '/workspace/agent', label: 'Agent Workspace', icon: 'agent' },
    ],
  },
  {
    title: 'Project',
    items: [
      { path: '/workspace/overview', label: 'Project Overview', icon: 'overview' },
      { path: '/workspace/architecture', label: 'System Architecture', icon: 'architecture' },
      { path: '/workspace/roadmap', label: 'Roadmap', icon: 'roadmap' },
      { path: '/workspace/progress', label: 'Progress', icon: 'progress' },
    ],
  },
  {
    title: 'Collaborate',
    items: [
      { path: '/workspace/docs', label: 'Documentation', icon: 'docs' },
      { path: '/workspace/team', label: 'Team', icon: 'team' },
      { path: '/workspace/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]
